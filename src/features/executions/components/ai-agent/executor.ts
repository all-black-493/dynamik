import { getDecryptedCredential } from "@/features/credentials/server/get-credential";
import type { AttachedNode, NodeExecutor } from "@/features/executions/lib/types";
import { CredentialType } from "@/generated/prisma";
import { aiAgentChannel } from "@/inngest/channels/ai-agent";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { generateText, jsonSchema, stepCountIs, tool, type ToolSet } from "ai";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

/** Bounds an agent loop, so a model that keeps calling tools still terminates. */
const DEFAULT_MAX_STEPS = 8
const MAX_STEPS_CEILING = 25

export type agentProvider = "openai" | "anthropic" | "google" | "deepseek" | "xai"

const CREDENTIAL_FOR: Record<agentProvider, CredentialType> = {
    openai: CredentialType.OPENAI,
    anthropic: CredentialType.ANTHROPIC,
    google: CredentialType.GEMINI,
    deepseek: CredentialType.DEEPSEEK,
    xai: CredentialType.GROK
}

type agentData = {
    variableName?: string;
    systemPrompt?: string;
    userPrompt?: string;
    maxSteps?: string;
}

type modelChildData = {
    provider?: agentProvider;
    model?: string;
    credentialId?: string;
    temperature?: string;
}

type toolChildData = {
    name?: string;
    description?: string;
    method?: string;
    url?: string;
    /** JSON Schema describing what the model must supply. */
    parameters?: string;
    /** Templated with the tool's arguments available as `args`. */
    body?: string;
    headers?: string;
}

const buildModel = (provider: agentProvider, apiKey: string, model: string) => {
    switch (provider) {
        case "anthropic": return createAnthropic({ apiKey })(model)
        case "google": return createGoogleGenerativeAI({ apiKey })(model)
        case "deepseek": return createDeepSeek({ apiKey })(model)
        case "xai": return createXai({ apiKey })(model)
        default: return createOpenAI({ apiKey })(model)
    }
}

/**
 * An agent whose model and tools are separate nodes on the canvas.
 *
 * This is the first node whose behaviour depends on other nodes rather than
 * only its own settings. The attachments arrive already resolved, so the
 * executor reads them the same way it reads its own data.
 */
export const aiAgentExecutor: NodeExecutor<agentData> = async ({
    data,
    nodeId,
    context,
    userId,
    step,
    publish,
    children
}) => {

    const fail = async (message: string) => {
        await publish(aiAgentChannel().status({ nodeId, status: "error" }))
        return new NonRetriableError(`AI Agent node: ${message}`)
    }

    await publish(aiAgentChannel().status({ nodeId, status: "loading" }))

    const variableName = data.variableName

    if (!variableName) throw await fail("Variable name is missing")
    if (!data.userPrompt?.trim()) throw await fail("Prompt is missing")

    const modelNode = children.find((child) => child.type === "AI_MODEL")

    if (!modelNode) {
        throw await fail("Attach a Model to this agent")
    }

    const modelData = modelNode.data as modelChildData
    const provider = modelData.provider ?? "openai"

    if (!modelData.credentialId) throw await fail("The Model needs a credential")
    if (!modelData.model?.trim()) throw await fail("The Model needs a model name")

    const apiKey = await step.run("agent-credential", () =>
        getDecryptedCredential({
            credentialId: modelData.credentialId as string,
            userId,
            type: CREDENTIAL_FOR[provider]
        })
    )

    if (!apiKey) throw await fail("The Model's credential was not found")

    const render = (template: string | undefined, extra: Record<string, unknown> = {}) =>
        template ? decode(Handlebars.compile(template)({ ...context, ...extra })) : ""

    const toolNodes = children.filter((child) => child.type === "AI_TOOL")

    // Each tool node becomes a callable the model may invoke. The call itself is
    // an HTTP request the workflow author described, so the agent can reach
    // anything without this node knowing what it is.
    const tools: ToolSet = {}
    const calls: { tool: string; args: unknown; ok: boolean }[] = []

    for (const toolNode of toolNodes as AttachedNode[]) {
        const toolData = toolNode.data as toolChildData
        const name = toolData.name?.trim()

        if (!name) throw await fail(`A Tool is missing its name`)
        if (!toolData.url?.trim()) throw await fail(`Tool "${name}" is missing its URL`)

        let schema: Record<string, unknown> = { type: "object", properties: {} }

        if (toolData.parameters?.trim()) {
            try {
                schema = JSON.parse(toolData.parameters)
            } catch (error) {
                throw await fail(
                    `Tool "${name}" has invalid parameter JSON (${(error as Error).message})`
                )
            }
        }

        tools[name] = tool({
            description: toolData.description || `Calls ${name}`,
            inputSchema: jsonSchema(schema),
            execute: async (args: unknown) => {
                const url = render(toolData.url, { args })
                const method = (toolData.method || "GET").toLowerCase()

                let headers: Record<string, string> = {}
                if (toolData.headers?.trim()) {
                    try {
                        headers = JSON.parse(render(toolData.headers, { args }))
                    } catch {
                        // A malformed header block should not end the run; the
                        // model is told the call failed and can try again.
                        return { error: "Tool headers are not valid JSON" }
                    }
                }

                try {
                    const response = await ky(url, {
                        method,
                        headers,
                        json: method === "get" || !toolData.body?.trim()
                            ? undefined
                            : JSON.parse(render(toolData.body, { args })),
                        timeout: 30_000
                    })

                    const text = await response.text()
                    calls.push({ tool: name, args, ok: true })

                    try {
                        return JSON.parse(text)
                    } catch {
                        return { text }
                    }
                } catch (error) {
                    calls.push({ tool: name, args, ok: false })
                    // Returned rather than thrown, so the model sees the failure
                    // and can recover instead of the whole run ending.
                    return { error: (error as Error).message }
                }
            }
        })
    }

    const requestedSteps = Number(data.maxSteps)
    const maxSteps = Number.isFinite(requestedSteps) && requestedSteps > 0
        ? Math.min(requestedSteps, MAX_STEPS_CEILING)
        : DEFAULT_MAX_STEPS

    try {
        const result = await step.run("agent-generate", async () => {
            const generated = await generateText({
                model: buildModel(provider, apiKey, modelData.model as string),
                system: data.systemPrompt ? render(data.systemPrompt) : undefined,
                prompt: render(data.userPrompt),
                tools: Object.keys(tools).length ? tools : undefined,
                // Without a stop condition a tool-calling model would return
                // after the first tool result rather than using it.
                stopWhen: stepCountIs(maxSteps),
                temperature: Number(modelData.temperature) || undefined
            })

            return {
                text: generated.text,
                steps: generated.steps.length,
                toolCalls: calls
            }
        })

        await publish(aiAgentChannel().status({ nodeId, status: "success" }))

        return {
            ...context,
            [variableName]: result
        }

    } catch (error) {
        await publish(aiAgentChannel().status({ nodeId, status: "error" }))
        throw error
    }
}

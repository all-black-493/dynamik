import type { NodeExecutor } from "@/features/executions/lib/types";
import { OpenAIChannel } from "@/inngest/channels/openai";
import { createMCPClient } from '@ai-sdk/mcp';
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import prisma from "@/lib/db";



Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

type OpenAIData = {
    variableName?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
    mcpServerUrl?: string;
    mcpAuthToken?: string;
    enabledTools?: string[];
    credentialId?: string
}

export const OpenAIExecutor: NodeExecutor<OpenAIData> = async ({
    data,
    nodeId,
    context,
    step,
    publish,
    userId
}) => {

    await publish(
        OpenAIChannel().status({
            nodeId,
            status: "loading"
        })
    )

    if (!data.credentialId) {
        await publish(
            OpenAIChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw new NonRetriableError("OpenAI node: Credential is required")
    }

    if (!data.variableName) {
        await publish(
            OpenAIChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw new NonRetriableError("OpenAI node: Variable name is missing")
    }

    if (!data.userPrompt) {
        await publish(
            OpenAIChannel().status({
                nodeId,
                status: "error"
            })
        )
    }

    const systemPrompt = data.systemPrompt
        ? Handlebars.compile(data.systemPrompt)(context)
        : "You are a helpful assistant"

    const userPrompt = Handlebars.compile(data.userPrompt)(context)

    const credential = await step.run("get-credential", () => {
        return prisma.credential.findUnique({
            where: {
                id: data.credentialId,
                userId
            }
        })
    })

    if (!credential) {
        throw new NonRetriableError("OpenAI node: Credential not found")
    }
    const openai = createOpenAI({
        apiKey: credential.value
    })

    let mcpClient;
    let finalTools = {}

    if (data.mcpServerUrl) {
        mcpClient = await createMCPClient({
            transport: {
                type: 'http',
                url: data.mcpServerUrl,
                headers: data.mcpAuthToken ? { Authorization: `Bearer ${data.mcpAuthToken}` } : {}
            }
        });

        const allAvailableTools = await mcpClient.tools();

        if (data.enabledTools && data.enabledTools.length > 0) {
            finalTools = Object.fromEntries(
                Object.entries(allAvailableTools).filter(([name]) =>
                    data.enabledTools!.includes(name)
                )
            );
        } else {
            // If no list is provided, perhaps default to no tools for safety
            finalTools = {};
        }

        console.log("[MCP TOOLS: ]", finalTools)
    }



    try {
        const { steps } = await step.ai.wrap(
            "openai-generate-text",
            generateText,
            {
                model: openai(data.model! || "gpt-4"),
                system: systemPrompt,
                prompt: userPrompt,
                experimental_telemetry: {
                    isEnabled: true,
                    recordInputs: true,
                    recordOutputs: true,
                },
                // tools: finalTools,
                maxRetries: 2
            }
        )

        const text = steps[0].content[0].type === "text"
            ? steps[0].content[0].text
            : "";

        if (mcpClient) await mcpClient.close();

        await publish(
            OpenAIChannel().status({
                nodeId,
                status: "success"
            })
        )

        return {
            ...context,
            [data.variableName]: {
                text
            }
        }
    } catch (error) {
        await publish(
            OpenAIChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw error
    }

}
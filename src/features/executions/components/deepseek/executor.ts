import type { NodeExecutor } from "@/features/executions/lib/types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars"
import { deepseekChannel } from "@/inngest/channels/deepseek";
import { createDeepSeek } from "@ai-sdk/deepseek"
import { generateText } from "ai"
import { createMCPClient } from '@ai-sdk/mcp';
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

type deepseekData = {
    variableName?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
    mcpServerUrl?: string;
    mcpAuthToken?: string;
    enabledTools?: string[];
    credentialId?: string

}

export const deepseekExecutor: NodeExecutor<deepseekData> = async ({
    data,
    nodeId,
    context,
    step,
    publish,
    userId
}) => {

    await publish(
        deepseekChannel().status({
            nodeId,
            status: "loading"
        })
    )

    if (!data.variableName) {
        await publish(
            deepseekChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw new NonRetriableError("Deepseek node: Variable name is missing")
    }

    if (!data.credentialId) {
        await publish(
            deepseekChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw new NonRetriableError("Deepseek node: Credential is required")
    }

    if (!data.userPrompt) {
        await publish(
            deepseekChannel().status({
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
        throw new NonRetriableError("Deepseek node: Credential not found")
    }
    const deepseek = createDeepSeek({
        apiKey: decrypt(credential.value)
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
            "deepseek-generate-text",
            generateText,
            {
                model: deepseek(data.model! || "deepseek-chat"),
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
            deepseekChannel().status({
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
            deepseekChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw error
    }

}
import type { NodeExecutor } from "@/features/executions/lib/types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars"
import { grokChannel } from "@/inngest/channels/grok";
import { createXai } from "@ai-sdk/xai"
import { generateText } from "ai"
import { createMCPClient } from '@ai-sdk/mcp';
import prisma from "@/lib/db";


Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

type grokData = {
    variableName?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
    mcpServerUrl?: string;
    mcpAuthToken?: string;
    enabledTools?: string[];
    credentialId?: string
}

export const grokExecutor: NodeExecutor<grokData> = async ({
    data,
    nodeId,
    context,
    step,
    publish,
    userId
}) => {

    await publish(
        grokChannel().status({
            nodeId,
            status: "loading"
        })
    )

    if (!data.credentialId) {
        await publish(
            grokChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw new NonRetriableError("Grok node: Credential is required")
    }

    if (!data.variableName) {
        await publish(
            grokChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw new NonRetriableError("Grok node: Variable name is missing")
    }

    if (!data.userPrompt) {
        await publish(
            grokChannel().status({
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

    if(!credential){
        throw new NonRetriableError("Grok node: Credential not found")
    }

    const grok = createXai({
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
            "grok-generate-text",
            generateText,
            {
                model: grok(data.model! || "grok-4-latest"),
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
            grokChannel().status({
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
            grokChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw error
    }

}
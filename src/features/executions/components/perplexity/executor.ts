import type { NodeExecutor } from "@/features/executions/lib/types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars"
import { perplexityChannel } from "@/inngest/channels/perplexity";
import { createPerplexity } from "@ai-sdk/perplexity"
import { generateText } from "ai"
import { createMCPClient } from '@ai-sdk/mcp';
import prisma from "@/lib/db";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

type perplexityData = {
    variableName?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
    mcpServerUrl?: string;
    mcpAuthToken?: string;
    enabledTools?: string[];
    credentialId?: string
}

export const perplexityExecutor: NodeExecutor<perplexityData> = async ({
    data,
    nodeId,
    context,
    step,
    publish
}) => {

    await publish(
        perplexityChannel().status({
            nodeId,
            status: "loading"
        })
    )

    if (!data.variableName) {
        await publish(
            perplexityChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw new NonRetriableError("Perplexity node: Variable name is missing")
    }

    if (!data.credentialId) {
        await publish(
            perplexityChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw new NonRetriableError("Perplexity node: Credential is required")
    }

    if (!data.userPrompt) {
        await publish(
            perplexityChannel().status({
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
                id: data.credentialId
            }
        })
    })

    if (!credential) {
        throw new NonRetriableError("Perplexity node: Credential not found")
    }
    const perplexity = createPerplexity({
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
            "perplexity-generate-text",
            generateText,
            {
                model: perplexity(data.model! || "sonar"),
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
            perplexityChannel().status({
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
            perplexityChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw error
    }

}
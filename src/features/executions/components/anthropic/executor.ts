import type { NodeExecutor } from "@/features/executions/lib/types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars"
import { anthropicChannel } from "@/inngest/channels/anthropic";
import { createAnthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"
import { createMCPClient } from '@ai-sdk/mcp';


Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

type anthropicData = {
    variableName?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
    mcpServerUrl?: string;
    mcpAuthToken?: string;
    enabledTools?: string[];
}

export const anthropicExecutor: NodeExecutor<anthropicData> = async ({
    data,
    nodeId,
    context,
    step,
    publish
}) => {

    await publish(
        anthropicChannel().status({
            nodeId,
            status: "loading"
        })
    )

    if (!data.variableName) {
        await publish(
            anthropicChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw new NonRetriableError("Anthropic node: Variable name is missing")
    }

    if (!data.userPrompt) {
        await publish(
            anthropicChannel().status({
                nodeId,
                status: "error"
            })
        )
    }

    const systemPrompt = data.systemPrompt
        ? Handlebars.compile(data.systemPrompt)(context)
        : "You are a helpful assistant"

    const userPrompt = Handlebars.compile(data.userPrompt)(context)

    const credentialValue = process.env.ANTHROPIC_API_KEY!

    const anthropic = createAnthropic({
        apiKey: credentialValue
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
            "anthropic-generate-text",
            generateText,
            {
                model: anthropic(data.model! || "claude-sonnet-4-5-20250929"),
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
            anthropicChannel().status({
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
            anthropicChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw error
    }

}
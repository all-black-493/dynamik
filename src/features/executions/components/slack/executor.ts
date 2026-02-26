import type { NodeExecutor } from "@/features/executions/lib/types";
import { slackChannel } from "@/inngest/channels/slack";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

type slackData = {
    variableName?: string;
    webhookUrl?: string;
    content?: string;

}

export const slackExecutor: NodeExecutor<slackData> = async ({
    data,
    nodeId,
    context,
    step,
    publish
}) => {

    await publish(
        slackChannel().status({
            nodeId,
            status: "loading"
        })
    )

    if (!data.content) {
        await publish(
            slackChannel().status({
                nodeId,
                status: "error"
            })
        )

        throw new NonRetriableError("Slack node: Message content is missing")

    }

    const rawContent = Handlebars.compile(data.content)(context)
    const content = decode(rawContent)
    
    try {

        const result = await step.run("slack-webhook", async () => {

            if (!data.webhookUrl) {
                await publish(
                    slackChannel().status({
                        nodeId,
                        status: "error"
                    })
                )
                throw new NonRetriableError("Slack node: Webhook URL is missing")
            }

            await ky.post(data.webhookUrl, {
                json: {
                    content: content.slice(0, 2000),
                }
            })

            if (!data.variableName) {
                await publish(
                    slackChannel().status({
                        nodeId,
                        status: "error"
                    })
                )
                throw new NonRetriableError("Slack node: Variable name is missing")
            }

            return {
                ...context,
                [data.variableName]: {
                    discordMessageSent: true,
                    messageContent: content.slice(0, 2000)
                }
            }
        })

        await publish(
            slackChannel().status({
                nodeId,
                status: "success"
            })
        )

        return result


    } catch (error) {
        await publish(
            slackChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw error
    }

}
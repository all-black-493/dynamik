import type { NodeExecutor } from "@/features/executions/lib/types";
import { telegramChannel } from "@/inngest/channels/telegram";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

type telegramData = {
    variableName?: string;
    webhookUrl?: string;
    content?: string;
    chat_id?: string

}

export const telegramExecutor: NodeExecutor<telegramData> = async ({
    data,
    nodeId,
    context,
    step,
    publish
}) => {

    await publish(
        telegramChannel().status({
            nodeId,
            status: "loading"
        })
    )

    if (!data.content) {
        await publish(
            telegramChannel().status({
                nodeId,
                status: "error"
            })
        )

        throw new NonRetriableError("Telegram node: Message content is missing")

    }

    const rawContent = Handlebars.compile(data.content)(context)
    const content = decode(rawContent)

    try {

        const result = await step.run("telegram-webhook", async () => {

            if (!data.webhookUrl) {
                await publish(
                    telegramChannel().status({
                        nodeId,
                        status: "error"
                    })
                )
                throw new NonRetriableError("Telegram node: Endpoint URL is missing")
            }

            if (!data.chat_id) {
                await publish(
                    telegramChannel().status({
                        nodeId,
                        status: "error"
                    })
                )
                throw new NonRetriableError("Telegram node: Chat ID is missing")
            }

            await ky.post(data.webhookUrl, {
                json: {
                    chat_id: data.chat_id,
                    text: content,
                }
            })

            if (!data.variableName) {
                await publish(
                    telegramChannel().status({
                        nodeId,
                        status: "error"
                    })
                )
                throw new NonRetriableError("Telegram node: Variable name is missing")
            }

            return {
                ...context,
                [data.variableName]: {
                    telegramMessageSent: true,
                    messageContent: content.slice(0, 2000)
                }
            }
        })

        await publish(
            telegramChannel().status({
                nodeId,
                status: "success"
            })
        )

        return result


    } catch (error) {
        await publish(
            telegramChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw error
    }

}
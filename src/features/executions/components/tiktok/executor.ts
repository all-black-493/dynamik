import type { NodeExecutor } from "@/features/executions/lib/types";
import { tiktokChannel } from "@/inngest/channels/tiktok";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

type tiktokData = {
    variableName?: string;
    webhookUrl?: string;
    content?: string;
}

export const tiktokExecutor: NodeExecutor<tiktokData> = async ({
    data,
    nodeId,
    context,
    step,
    publish
}) => {

    await publish(
        tiktokChannel().status({
            nodeId,
            status: "loading"
        })
    )

    if (!data.content) {
        await publish(
            tiktokChannel().status({
                nodeId,
                status: "error"
            })
        )

        throw new NonRetriableError("Tiktok node: Message content is missing")

    }

    const rawContent = Handlebars.compile(data.content)(context)
    const content = decode(rawContent)

    try {

        const result = await step.run("tiktok-webhook", async () => {

            if (!data.webhookUrl) {
                await publish(
                    tiktokChannel().status({
                        nodeId,
                        status: "error"
                    })
                )
                throw new NonRetriableError("Tiktok node: Endpoint URL is missing")
            }


            await ky.post(data.webhookUrl, {
                json: {
                    text: content,
                }
            })

            if (!data.variableName) {
                await publish(
                    tiktokChannel().status({
                        nodeId,
                        status: "error"
                    })
                )
                throw new NonRetriableError("Tiktok node: Variable name is missing")
            }

            return {
                ...context,
                [data.variableName]: {
                    tiktokMessageSent: true,
                    messageContent: content.slice(0, 2000)
                }
            }
        })

        await publish(
            tiktokChannel().status({
                nodeId,
                status: "success"
            })
        )

        return result


    } catch (error) {
        await publish(
            tiktokChannel().status({
                nodeId,
                status: "error"
            })
        )
        throw error
    }

}
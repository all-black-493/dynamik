import type { NodeExecutor } from "@/features/executions/lib/types";
import { whatsappChannel } from "@/inngest/channels/whatsapp";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky, { HTTPError } from "ky";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

const GRAPH_API_VERSION = "v21.0"
const MAX_BODY_LENGTH = 4096

type whatsappData = {
    variableName?: string;
    phoneNumberId?: string;
    recipient?: string;
    content?: string;
    previewUrl?: boolean;
    credentialId?: string
}

type whatsappResponse = {
    messages?: { id: string }[];
    contacts?: { wa_id: string }[]
}

/** Meta wraps a failure in an error object with the useful part inside. */
type whatsappError = {
    error?: {
        message?: string;
        type?: string;
        code?: number;
        error_data?: { details?: string }
    }
}

export const whatsappExecutor: NodeExecutor<whatsappData> = async ({
    data,
    nodeId,
    context,
    userId,
    step,
    publish
}) => {

    const fail = async (message: string) => {
        await publish(
            whatsappChannel().status({
                nodeId,
                status: "error"
            })
        )
        return new NonRetriableError(`Whatsapp node: ${message}`)
    }

    await publish(
        whatsappChannel().status({
            nodeId,
            status: "loading"
        })
    )

    const variableName = data.variableName

    if (!variableName) {
        throw await fail("Variable name is missing")
    }

    if (!data.credentialId) {
        throw await fail("Credential is required")
    }

    if (!data.phoneNumberId) {
        throw await fail("Phone number ID is missing")
    }

    if (!data.recipient) {
        throw await fail("Recipient phone number is missing")
    }

    if (!data.content) {
        throw await fail("Message content is missing")
    }

    const recipient = decode(Handlebars.compile(data.recipient)(context)).trim()
    const content = decode(Handlebars.compile(data.content)(context))

    if (!recipient) {
        throw await fail("Recipient phone number resolved to an empty value")
    }

    if (!content.trim()) {
        throw await fail("Message content resolved to an empty value")
    }

    const body = content.slice(0, MAX_BODY_LENGTH)

    const credential = await step.run("get-credential", () => {
        return prisma.credential.findUnique({
            where: {
                id: data.credentialId,
                userId
            }
        })
    })

    if (!credential) {
        throw await fail("Credential not found")
    }

    const accessToken = decrypt(credential.value)

    try {
        const result = await step.run("whatsapp-send-message", async () => {
            const response = await ky.post(
                `https://graph.facebook.com/${GRAPH_API_VERSION}/${data.phoneNumberId}/messages`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    },
                    json: {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: recipient,
                        type: "text",
                        text: {
                            preview_url: data.previewUrl ?? false,
                            body
                        }
                    }
                }
            ).json<whatsappResponse>()

            return {
                ...context,
                [variableName]: {
                    whatsappMessageSent: true,
                    messageId: response.messages?.[0]?.id,
                    recipient: response.contacts?.[0]?.wa_id ?? recipient,
                    messageContent: body
                }
            }
        })

        await publish(
            whatsappChannel().status({
                nodeId,
                status: "success"
            })
        )

        return result

    } catch (error) {
        await publish(
            whatsappChannel().status({
                nodeId,
                status: "error"
            })
        )

        // Meta explains the refusal in the body: an unverified recipient, a
        // template needed outside the 24 hour window, an expired token. Letting
        // a bare HTTP error through would record none of that.
        if (error instanceof HTTPError) {
            const detail = (await error.response
                .clone()
                .json()
                .catch(() => null)) as whatsappError | null

            const message = detail?.error?.error_data?.details ?? detail?.error?.message

            if (message) {
                throw new Error(
                    `Whatsapp node: ${message}${detail?.error?.code ? ` (code ${detail.error.code})` : ""}`
                )
            }
        }

        throw error
    }

}

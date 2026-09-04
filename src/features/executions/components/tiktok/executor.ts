import type { NodeExecutor } from "@/features/executions/lib/types";
import { tiktokChannel } from "@/inngest/channels/tiktok";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

const API_BASE = "https://open.tiktokapis.com/v2/post/publish"
const MAX_TITLE_LENGTH = 2200

// DIRECT_POST publishes to the account and needs the video.publish scope.
// INBOX drops the video into the user's TikTok drafts for them to finish and
// publish by hand, and only needs video.upload.
type postMode = "DIRECT_POST" | "INBOX"

type tiktokData = {
    variableName?: string;
    credentialId?: string;
    postMode?: postMode;
    videoUrl?: string;
    title?: string;
    privacyLevel?: string;
    disableComment?: boolean;
    disableDuet?: boolean;
    disableStitch?: boolean;
}

type tiktokResponse = {
    data?: { publish_id?: string };
    error?: { code?: string; message?: string; log_id?: string }
}

export const tiktokExecutor: NodeExecutor<tiktokData> = async ({
    data,
    nodeId,
    context,
    userId,
    step,
    publish
}) => {

    const fail = async (message: string) => {
        await publish(
            tiktokChannel().status({
                nodeId,
                status: "error"
            })
        )
        return new NonRetriableError(`Tiktok node: ${message}`)
    }

    await publish(
        tiktokChannel().status({
            nodeId,
            status: "loading"
        })
    )

    if (!data.variableName) {
        throw await fail("Variable name is missing")
    }

    if (!data.credentialId) {
        throw await fail("Credential is required")
    }

    if (!data.videoUrl) {
        throw await fail("Video URL is missing")
    }

    const mode: postMode = data.postMode ?? "INBOX"

    if (mode === "DIRECT_POST" && !data.privacyLevel) {
        throw await fail("Privacy level is required for a direct post")
    }

    const videoUrl = decode(Handlebars.compile(data.videoUrl)(context)).trim()

    if (!videoUrl) {
        throw await fail("Video URL resolved to an empty value")
    }

    const title = data.title
        ? decode(Handlebars.compile(data.title)(context)).slice(0, MAX_TITLE_LENGTH)
        : ""

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
        const result = await step.run("tiktok-publish-init", async () => {
            const endpoint = mode === "DIRECT_POST"
                ? `${API_BASE}/video/init/`
                : `${API_BASE}/inbox/video/init/`

            const body: Record<string, unknown> = {
                source_info: {
                    source: "PULL_FROM_URL",
                    video_url: videoUrl
                }
            }

            // The inbox endpoint rejects post_info; only a direct post carries it.
            if (mode === "DIRECT_POST") {
                body.post_info = {
                    title,
                    privacy_level: data.privacyLevel,
                    disable_comment: data.disableComment ?? false,
                    disable_duet: data.disableDuet ?? false,
                    disable_stitch: data.disableStitch ?? false
                }
            }

            const response = await ky.post(endpoint, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json; charset=UTF-8"
                },
                json: body
            }).json<tiktokResponse>()

            // TikTok answers 200 with a non-ok error code rather than an HTTP
            // error, so ky would treat a rejected post as a success.
            if (response.error?.code && response.error.code !== "ok") {
                throw new NonRetriableError(
                    `Tiktok node: ${response.error.code} ${response.error.message ?? ""}`.trim()
                )
            }

            const publishId = response.data?.publish_id

            if (!publishId) {
                throw new NonRetriableError("Tiktok node: No publish ID returned")
            }

            return {
                ...context,
                [data.variableName!]: {
                    tiktokPostInitiated: true,
                    publishId,
                    postMode: mode,
                    videoUrl,
                    title
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

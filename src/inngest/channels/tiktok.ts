import { channel, topic } from "@inngest/realtime"

export const TIKTOK_CHANNEL_NAME = "tiktok-execution"

export const tiktokChannel = channel(TIKTOK_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error"
        }>()
    )
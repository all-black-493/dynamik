import { channel, topic } from "@inngest/realtime"

export const FILTER_CHANNEL_NAME = "filter-execution"

export const filterChannel = channel(FILTER_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error"
        }>()
    )

import { channel, topic } from "@inngest/realtime"

export const LOOP_CHANNEL_NAME = "loop-execution"

export const loopChannel = channel(LOOP_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error"
        }>()
    )

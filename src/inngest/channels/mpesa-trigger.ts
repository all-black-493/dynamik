import { channel, topic } from "@inngest/realtime"

export const MPESA_TRIGGER_CHANNEL_NAME = "mpesa-trigger-execution"

export const mpesaTriggerChannel = channel(MPESA_TRIGGER_CHANNEL_NAME)
.addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error"
    }>()
)
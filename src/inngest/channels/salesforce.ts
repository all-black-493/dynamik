import { channel, topic } from "@inngest/realtime"

export const SALESFORCE_CHANNEL_NAME = "salesforce-execution"

export const salesforceChannel = channel(SALESFORCE_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error"
        }>()
    )

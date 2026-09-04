import { channel, topic } from "@inngest/realtime"

export const HUBSPOT_CHANNEL_NAME = "hubspot-execution"

export const hubspotChannel = channel(HUBSPOT_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error"
        }>()
    )

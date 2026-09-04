import { channel, topic } from "@inngest/realtime"

export const POSTGRES_CHANNEL_NAME = "postgres-execution"

export const postgresChannel = channel(POSTGRES_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error"
        }>()
    )

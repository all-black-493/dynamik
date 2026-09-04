import { channel, topic } from "@inngest/realtime"

export const ODOO_CHANNEL_NAME = "odoo-execution"

export const odooChannel = channel(ODOO_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error"
        }>()
    )

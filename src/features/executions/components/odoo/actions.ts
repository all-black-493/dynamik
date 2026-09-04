"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { odooChannel } from "@/inngest/channels/odoo"
import { inngest } from "@/inngest/client"

export type odooToken = Realtime.Token<typeof odooChannel, ["status"]>

export async function fetchOdooRealtimeToken(): Promise<odooToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: odooChannel(),
        topics: ["status"]
    })

    return token
}

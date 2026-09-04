"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { ifChannel } from "@/inngest/channels/if"
import { inngest } from "@/inngest/client"

export type ifToken = Realtime.Token<typeof ifChannel, ["status"]>

export async function fetchIfRealtimeToken(): Promise<ifToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: ifChannel(),
        topics: ["status"]
    })

    return token
}

"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { displayChannel } from "@/inngest/channels/display"
import { inngest } from "@/inngest/client"

export type displayToken = Realtime.Token<typeof displayChannel, ["status", "output"]>

export async function fetchDisplayRealtimeToken(): Promise<displayToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: displayChannel(),
        topics: ["status", "output"]
    })

    return token
}

"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { grokChannel } from "@/inngest/channels/grok"
import { inngest } from "@/inngest/client"

export type grokToken = Realtime.Token<typeof grokChannel, ["status"]>


export async function fetchGrokRealtimeToken(): Promise<grokToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: grokChannel(),
        topics: ["status"]
    })

    return token
}
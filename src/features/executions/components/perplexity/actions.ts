"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { perplexityChannel } from "@/inngest/channels/perplexity"
import { inngest } from "@/inngest/client"

export type perplexityToken = Realtime.Token<typeof perplexityChannel, ["status"]>


export async function fetchPerplexityRealtimeToken(): Promise<perplexityToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: perplexityChannel(),
        topics: ["status"]
    })

    return token
}
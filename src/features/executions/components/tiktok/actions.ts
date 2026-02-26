"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { tiktokChannel } from "@/inngest/channels/tiktok"
import { inngest } from "@/inngest/client"

export type tiktokToken = Realtime.Token<typeof tiktokChannel, ["status"]>


export async function fetchTiktokRealtimeToken(): Promise<tiktokToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: tiktokChannel(),
        topics: ["status"]
    })

    return token
}
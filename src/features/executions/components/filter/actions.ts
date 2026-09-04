"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { filterChannel } from "@/inngest/channels/filter"
import { inngest } from "@/inngest/client"

export type filterToken = Realtime.Token<typeof filterChannel, ["status"]>

export async function fetchFilterRealtimeToken(): Promise<filterToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: filterChannel(),
        topics: ["status"]
    })

    return token
}

"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { mergeChannel } from "@/inngest/channels/merge"
import { inngest } from "@/inngest/client"

export type mergeToken = Realtime.Token<typeof mergeChannel, ["status"]>

export async function fetchMergeRealtimeToken(): Promise<mergeToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: mergeChannel(),
        topics: ["status"]
    })

    return token
}

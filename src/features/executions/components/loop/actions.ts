"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { loopChannel } from "@/inngest/channels/loop"
import { inngest } from "@/inngest/client"

export type loopToken = Realtime.Token<typeof loopChannel, ["status"]>

export async function fetchLoopRealtimeToken(): Promise<loopToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: loopChannel(),
        topics: ["status"]
    })

    return token
}

"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { deepseekChannel } from "@/inngest/channels/deepseek"
import { inngest } from "@/inngest/client"

export type deepseekToken = Realtime.Token<typeof deepseekChannel, ["status"]>


export async function fetchDeepseekRealtimeToken(): Promise<deepseekToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: deepseekChannel(),
        topics: ["status"]
    })

    return token
}
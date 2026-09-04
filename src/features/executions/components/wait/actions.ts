"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { waitChannel } from "@/inngest/channels/wait"
import { inngest } from "@/inngest/client"

export type waitToken = Realtime.Token<typeof waitChannel, ["status"]>

export async function fetchWaitRealtimeToken(): Promise<waitToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: waitChannel(),
        topics: ["status"]
    })

    return token
}

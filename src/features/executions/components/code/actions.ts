"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { codeChannel } from "@/inngest/channels/code"
import { inngest } from "@/inngest/client"

export type codeToken = Realtime.Token<typeof codeChannel, ["status"]>

export async function fetchCodeRealtimeToken(): Promise<codeToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: codeChannel(),
        topics: ["status"]
    })

    return token
}

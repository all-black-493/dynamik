"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { switchChannel } from "@/inngest/channels/switch"
import { inngest } from "@/inngest/client"

export type switchToken = Realtime.Token<typeof switchChannel, ["status"]>

export async function fetchSwitchRealtimeToken(): Promise<switchToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: switchChannel(),
        topics: ["status"]
    })

    return token
}

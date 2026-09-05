"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { scheduleTriggerChannel } from "@/inngest/channels/schedule-trigger"
import { inngest } from "@/inngest/client"

export type scheduleTriggerToken = Realtime.Token<typeof scheduleTriggerChannel, ["status"]>

export async function fetchScheduleTriggerRealtimeToken(): Promise<scheduleTriggerToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: scheduleTriggerChannel(),
        topics: ["status"]
    })

    return token
}

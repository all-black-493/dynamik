"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { mpesaTriggerChannel } from "@/inngest/channels/mpesa-trigger"
import { inngest } from "@/inngest/client"

export type MPESATriggerToken = Realtime.Token<typeof mpesaTriggerChannel, ["status"]>


export async function fetchMPESARealtimeToken(): Promise<MPESATriggerToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: mpesaTriggerChannel(),
        topics: ["status"]
    })

    return token
}
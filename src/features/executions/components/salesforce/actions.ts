"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { salesforceChannel } from "@/inngest/channels/salesforce"
import { inngest } from "@/inngest/client"

export type salesforceToken = Realtime.Token<typeof salesforceChannel, ["status"]>

export async function fetchSalesforceRealtimeToken(): Promise<salesforceToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: salesforceChannel(),
        topics: ["status"]
    })

    return token
}

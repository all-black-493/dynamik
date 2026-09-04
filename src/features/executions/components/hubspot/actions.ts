"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { hubspotChannel } from "@/inngest/channels/hubspot"
import { inngest } from "@/inngest/client"

export type hubspotToken = Realtime.Token<typeof hubspotChannel, ["status"]>

export async function fetchHubspotRealtimeToken(): Promise<hubspotToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: hubspotChannel(),
        topics: ["status"]
    })

    return token
}

"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { postgresChannel } from "@/inngest/channels/postgres"
import { inngest } from "@/inngest/client"

export type postgresToken = Realtime.Token<typeof postgresChannel, ["status"]>

export async function fetchPostgresRealtimeToken(): Promise<postgresToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: postgresChannel(),
        topics: ["status"]
    })

    return token
}

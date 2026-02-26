"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { slackChannel } from "@/inngest/channels/slack"
import { inngest } from "@/inngest/client"

export type slackToken = Realtime.Token<typeof slackChannel, ["status"]>


export async function fetchSlackRealtimeToken(): Promise<slackToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: slackChannel(),
        topics: ["status"]
    })

    return token
}
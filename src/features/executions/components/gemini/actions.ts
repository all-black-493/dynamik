"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { geminiChannel } from "@/inngest/channels/gemini"
import { inngest } from "@/inngest/client"

export type geminiToken = Realtime.Token<typeof geminiChannel, ["status"]>


export async function geminiRealtimeToken(): Promise<geminiToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: geminiChannel(),
        topics: ["status"]
    })

    return token
}
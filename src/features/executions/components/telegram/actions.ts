"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { telegramChannel } from "@/inngest/channels/telegram"
import { inngest } from "@/inngest/client"

export type telegramToken = Realtime.Token<typeof telegramChannel, ["status"]>


export async function fetchTelegramRealtimeToken(): Promise<telegramToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: telegramChannel(),
        topics: ["status"]
    })

    return token
}
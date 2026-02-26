"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { whatsappChannel } from "@/inngest/channels/whatsapp"
import { inngest } from "@/inngest/client"

export type whatsappToken = Realtime.Token<typeof whatsappChannel, ["status"]>


export async function fetchWhatsappRealtimeToken(): Promise<whatsappToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: whatsappChannel(),
        topics: ["status"]
    })

    return token
}
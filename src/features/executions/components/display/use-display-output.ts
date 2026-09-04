import { useInngestSubscription } from "@inngest/realtime/hooks"
import { useEffect, useState } from "react"
import type { NodeStatus } from "@/components/react-flow/node-status-indicator"
import { DISPLAY_CHANNEL_NAME } from "@/inngest/channels/display"
import type { TypedValue } from "@/features/executions/lib/typed-values"
import { fetchDisplayRealtimeToken } from "./actions"

type DisplayOutput = { title?: string; value: TypedValue }

/**
 * Status and rendered output from one subscription.
 *
 * The generic node hook watches a single topic; this node needs two, and
 * opening a second subscription for the same channel would mean a second token
 * and a second connection for the same messages.
 */
export const useDisplayOutput = (nodeId: string) => {
    const [status, setStatus] = useState<NodeStatus>("initial")
    const [output, setOutput] = useState<DisplayOutput | null>(null)

    const { data, error } = useInngestSubscription({
        refreshToken: fetchDisplayRealtimeToken,
        enabled: true
    })

    useEffect(() => {
        if (error) {
            console.error("[realtime] display subscription failed:", error)
        }
    }, [error])

    useEffect(() => {
        if (!data?.length) return

        for (const message of data) {
            if (
                message.kind !== "data" ||
                message.channel !== DISPLAY_CHANNEL_NAME ||
                message.data.nodeId !== nodeId
            ) {
                continue
            }

            if (message.topic === "status") {
                setStatus(message.data.status as NodeStatus)
            }

            if (message.topic === "output") {
                const payload = message.data as unknown as DisplayOutput
                setOutput({ title: payload.title, value: payload.value })
            }
        }
    }, [data, nodeId])

    return { status, output }
}

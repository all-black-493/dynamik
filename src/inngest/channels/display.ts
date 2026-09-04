import { channel, topic } from "@inngest/realtime"
import type { TypedValue } from "@/features/executions/lib/typed-values"

export const DISPLAY_CHANNEL_NAME = "display-execution"

export const displayChannel = channel(DISPLAY_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "loading" | "success" | "error"
        }>()
    )
    // The rendered value travels with the run, so the canvas can show output as
    // it is produced rather than only on the executions page afterwards.
    .addTopic(
        topic("output").type<{
            nodeId: string;
            title?: string;
            value: TypedValue
        }>()
    )

import type { NodeExecutor } from "@/features/executions/lib/types";
import { scheduleTriggerChannel } from "@/inngest/channels/schedule-trigger";

/**
 * Passes the run straight through.
 *
 * The schedule itself lives outside a run: a cron function checks every minute
 * which workflows are due and starts them. By the time this executes, the
 * decision has already been made, so there is nothing left for it to do beyond
 * marking itself done on the canvas.
 */
export const scheduleTriggerExecutor: NodeExecutor = async ({
    nodeId,
    context,
    publish
}) => {
    await publish(scheduleTriggerChannel().status({ nodeId, status: "loading" }))
    await publish(scheduleTriggerChannel().status({ nodeId, status: "success" }))

    return context
}

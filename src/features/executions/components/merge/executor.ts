import type { NodeExecutor } from "@/features/executions/lib/types";
import { mergeChannel } from "@/inngest/channels/merge";

type mergeData = {
    variableName?: string;
    /**
     * Read by the engine, not here. When true the node does not run until every
     * inbound edge has delivered control; otherwise the first one through is
     * enough.
     */
    waitForAll?: boolean;
}

/**
 * Rejoins branches.
 *
 * The waiting is the whole feature, and it happens in the engine before this
 * runs, because only the engine knows which inbound edges delivered control.
 *
 * There is deliberately no data merging. Other tools need it because each
 * branch carries its own items; here every node reads and writes one shared
 * context, so by the time a merge is reached that context already holds
 * whatever the branches produced. Combining would mean copying data that is
 * already present.
 */
export const mergeExecutor: NodeExecutor<mergeData> = async ({
    data,
    nodeId,
    context,
    publish
}) => {

    await publish(mergeChannel().status({ nodeId, status: "loading" }))
    await publish(mergeChannel().status({ nodeId, status: "success" }))

    if (!data.variableName) return context

    return {
        ...context,
        [data.variableName]: {
            waitedForAll: Boolean(data.waitForAll)
        }
    }
}

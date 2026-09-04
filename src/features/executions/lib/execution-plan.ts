import { type SortableNode, topologicalSort } from "@/inngest/utils"

export type PlanConnection = {
    fromNodeId: string
    toNodeId: string
    fromOutput: string
}

/**
 * Decides which nodes a run visits.
 *
 * Execution used to be a list: sort topologically, run everything. That cannot
 * express a branch, because a node downstream of a condition would run whether
 * or not the condition chose it.
 *
 * Instead a node runs only once something upstream hands control to it. Nodes
 * with no inbound edge are entry points and start active, so a straight-line
 * workflow behaves exactly as it did before. After a node runs it activates the
 * targets of its outgoing edges, but only those whose fromOutput the node
 * selected, which is what prunes the branch not taken.
 *
 * Walking in topological order is what makes this correct in one pass: by the
 * time a node is reached, every node that could have activated it has run.
 */
export const createExecutionPlan = <TNode extends SortableNode>(
    nodes: TNode[],
    connections: PlanConnection[]
) => {
    const sorted = topologicalSort(nodes, connections)

    const outgoing = new Map<string, PlanConnection[]>()
    for (const connection of connections) {
        const edges = outgoing.get(connection.fromNodeId) ?? []
        edges.push(connection)
        outgoing.set(connection.fromNodeId, edges)
    }

    const targeted = new Set(connections.map((connection) => connection.toNodeId))
    const active = new Set(
        sorted.filter((node) => !targeted.has(node.id)).map((node) => node.id)
    )

    const skipped: string[] = []

    return {
        sorted,

        isActive: (nodeId: string) => active.has(nodeId),

        /** Records a node the run passed over, for the execution record. */
        skip: (nodeId: string) => {
            skipped.push(nodeId)
        },

        /** Hands control to the targets of the outputs this node selected. */
        advance: (nodeId: string, outputs: string[]) => {
            for (const connection of outgoing.get(nodeId) ?? []) {
                if (outputs.includes(connection.fromOutput)) {
                    active.add(connection.toNodeId)
                }
            }
        },

        getSkipped: () => [...skipped]
    }
}

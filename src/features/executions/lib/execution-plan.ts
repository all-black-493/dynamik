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
export type PlanOptions<TNode> = {
    /**
     * Nodes that must not run until every inbound edge has delivered control.
     *
     * Correct in a single pass because the walk is topological: by the time a
     * node is reached, every predecessor has already run or been skipped, so
     * the answer is final rather than provisional.
     */
    requiresAllInputs?: (node: TNode) => boolean
}

export const createExecutionPlan = <TNode extends SortableNode>(
    nodes: TNode[],
    connections: PlanConnection[],
    options: PlanOptions<TNode> = {}
) => {
    const sorted = topologicalSort(nodes, connections)

    const outgoing = new Map<string, PlanConnection[]>()
    for (const connection of connections) {
        const edges = outgoing.get(connection.fromNodeId) ?? []
        edges.push(connection)
        outgoing.set(connection.fromNodeId, edges)
    }

    const incoming = new Map<string, PlanConnection[]>()
    for (const connection of connections) {
        const edges = incoming.get(connection.toNodeId) ?? []
        edges.push(connection)
        incoming.set(connection.toNodeId, edges)
    }

    const targeted = new Set(connections.map((connection) => connection.toNodeId))
    const active = new Set(
        sorted.filter((node) => !targeted.has(node.id)).map((node) => node.id)
    )

    // Which specific inbound edges delivered control. A Merge node that must
    // wait for every input needs this, not just the fact that one arrived.
    const arrived = new Map<string, Set<string>>()
    const edgeKey = (connection: PlanConnection) =>
        `${connection.fromNodeId}:${connection.fromOutput}`

    const byId = new Map(sorted.map((node) => [node.id, node]))
    const skipped: string[] = []

    return {
        sorted,

        isActive: (nodeId: string) => {
            if (!active.has(nodeId)) return false

            const node = byId.get(nodeId)
            if (!node || !options.requiresAllInputs?.(node)) return true

            const edges = incoming.get(nodeId) ?? []
            if (edges.length === 0) return true

            const seen = arrived.get(nodeId)
            return edges.every((edge) => seen?.has(edgeKey(edge)))
        },

        /** Records a node the run passed over, for the execution record. */
        skip: (nodeId: string) => {
            skipped.push(nodeId)
        },

        /** Hands control to the targets of the outputs this node selected. */
        advance: (nodeId: string, outputs: string[]) => {
            for (const connection of outgoing.get(nodeId) ?? []) {
                if (outputs.includes(connection.fromOutput)) {
                    active.add(connection.toNodeId)

                    const seen = arrived.get(connection.toNodeId) ?? new Set<string>()
                    seen.add(edgeKey(connection))
                    arrived.set(connection.toNodeId, seen)
                }
            }
        },

        /** True when every inbound edge of a node has delivered control. */
        allInputsArrived: (nodeId: string) => {
            const edges = incoming.get(nodeId) ?? []
            if (edges.length === 0) return true

            const seen = arrived.get(nodeId)
            return edges.every((edge) => seen?.has(edgeKey(edge)))
        },

        /**
         * Everything downstream of one output, as a self-contained graph.
         *
         * This is the body of a loop: the nodes hanging off the iterating
         * output, plus only the edges internal to that set, so the body can be
         * planned and run on its own. The originating node is excluded, so an
         * edge pointing back at it simply drops out rather than forming a cycle.
         */
        subgraphFrom: (nodeId: string, output: string) => {
            const bodyIds = new Set<string>()
            const queue = (outgoing.get(nodeId) ?? [])
                .filter((connection) => connection.fromOutput === output)
                .map((connection) => connection.toNodeId)

            while (queue.length) {
                const current = queue.shift() as string
                if (current === nodeId || bodyIds.has(current)) continue

                bodyIds.add(current)

                for (const connection of outgoing.get(current) ?? []) {
                    queue.push(connection.toNodeId)
                }
            }

            return {
                nodes: sorted.filter((node) => bodyIds.has(node.id)),
                connections: connections.filter(
                    (connection) =>
                        bodyIds.has(connection.fromNodeId) && bodyIds.has(connection.toNodeId)
                ),
                nodeIds: [...bodyIds]
            }
        },

        getNode: (nodeId: string) => byId.get(nodeId),

        getSkipped: () => [...skipped]
    }
}

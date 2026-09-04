import toposort from "toposort"
import { inngest } from "./client"
import { createId } from "@paralleldrive/cuid2"

/**
 * Only the identity of a node and the shape of an edge matter here, so these
 * are structural. That lets the sort run on rows that have been through
 * step.run, which turns Date fields into strings.
 */
export type SortableNode = { id: string }
export type SortableConnection = { fromNodeId: string; toNodeId: string }

export const topologicalSort = <TNode extends SortableNode>(
    nodes: TNode[],
    connections: SortableConnection[]
): TNode[] => {

    if (connections.length === 0) {
        return nodes
    }

    const edges: [string, string][] = connections.map((conn) => [
        conn.fromNodeId,
        conn.toNodeId

    ])

    const connectedNodeIds = new Set<string>()

    for (const conn of connections) {
        connectedNodeIds.add(conn.fromNodeId)
        connectedNodeIds.add(conn.toNodeId)
    }

    for (const node of nodes) {
        if (!connectedNodeIds.has(node.id)) {
            edges.push([node.id, node.id])
        }
    }

    let sortedNodeIds: string[]

    try {
        sortedNodeIds = toposort(edges)
        sortedNodeIds = [...new Set(sortedNodeIds)]

    } catch (error) {
        if (error instanceof Error && error.message.includes("Cyclic")) {
            // toposort names the node it got stuck on, which is the only
            // actionable part. Without it the user is told their workflow has a
            // cycle and left to find it by eye.
            const culprit = error.message.match(/node was:\s*"?([^"\n]+)"?/)?.[1]

            throw new Error(
                culprit
                    ? `Workflow contains a cycle involving node ${culprit}. A Loop node does not need a connection back into it: everything on its "each" branch already repeats.`
                    : "Workflow contains a cycle"
            )
        }
        throw error
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    return sortedNodeIds
        .map((id) => nodeMap.get(id))
        .filter((node): node is TNode => Boolean(node))
}

export const sendWorkflowExecution = async (data: {
    workflowId: string;
    [key: string]: any;
}) => {
    return inngest.send({
        name: "workflows/execute.workflow",
        data,
        id: createId()
    })
}
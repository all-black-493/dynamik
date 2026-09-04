"use client"

import { OPERATOR_LABELS } from "@/features/executions/lib/conditions"
import { IF_CHANNEL_NAME } from "@/inngest/channels/if"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { GitBranchIcon } from "lucide-react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchIfRealtimeToken } from "./actions"
import { IfDialog, type IfFormValues } from "./dialog"
import { IF_OUTPUT_FALSE, IF_OUTPUT_TRUE } from "./executor"

type ifNodeData = {
    variableName?: string;
    combinator?: "AND" | "OR";
    conditions?: { left: string; operator: string; right?: string }[];
}

type IfNodeType = Node<ifNodeData>

const OUTPUTS = [
    { id: IF_OUTPUT_TRUE, label: "true" },
    { id: IF_OUTPUT_FALSE, label: "false" }
]

export const IfNode = memo((props: NodeProps<IfNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)

    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: IF_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchIfRealtimeToken,
    })

    const handleOpenSettings = () => SetDialogOpen(true)

    const handleSubmit = (values: IfFormValues) => {
        setNodes((nodes) => nodes.map((node) => {
            if (node.id === props.id) {
                return { ...node, data: { ...node.data, ...values } }
            }
            return node
        }))
    }

    const nodeData = props.data
    const first = nodeData?.conditions?.[0]
    const extra = (nodeData?.conditions?.length ?? 0) - 1

    const description = first
        ? `${first.left} ${OPERATOR_LABELS[first.operator] ?? first.operator} ${first.right ?? ""}`.trim() +
          (extra > 0 ? ` (+${extra})` : "")
        : "Not configured"

    return (
        <>
            <IfDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData as Partial<IfFormValues>}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon={GitBranchIcon}
                name="If"
                status={nodeStatus}
                description={description.slice(0, 60)}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
                outputs={OUTPUTS}
            />
        </>
    )
})

IfNode.displayName = "IfNode"

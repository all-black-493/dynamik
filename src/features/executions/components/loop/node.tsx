"use client"

import { LOOP_CHANNEL_NAME } from "@/inngest/channels/loop"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { RepeatIcon } from "lucide-react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchLoopRealtimeToken } from "./actions"
import { LoopDialog, type LoopFormValues } from "./dialog"
import { LOOP_OUTPUT_BODY, LOOP_OUTPUT_DONE } from "./executor"

type loopNodeData = {
    variableName?: string;
    itemsPath?: string;
    maxItems?: string;
}

type LoopNodeType = Node<loopNodeData>

const OUTPUTS = [
    { id: LOOP_OUTPUT_BODY, label: "each" },
    { id: LOOP_OUTPUT_DONE, label: "done" }
]

export const LoopNode = memo((props: NodeProps<LoopNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)

    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: LOOP_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchLoopRealtimeToken,
    })

    const handleOpenSettings = () => SetDialogOpen(true)

    const handleSubmit = (values: LoopFormValues) => {
        setNodes((nodes) => nodes.map((node) => {
            if (node.id === props.id) {
                return { ...node, data: { ...node.data, ...values } }
            }
            return node
        }))
    }

    const nodeData = props.data

    const description = nodeData?.itemsPath
        ? `each of ${nodeData.itemsPath}`
        : "Not configured"

    return (
        <>
            <LoopDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData as Partial<LoopFormValues>}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon={RepeatIcon}
                name="Loop"
                status={nodeStatus}
                description={description.slice(0, 60)}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
                outputs={OUTPUTS}
            />
        </>
    )
})

LoopNode.displayName = "LoopNode"

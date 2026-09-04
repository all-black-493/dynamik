"use client"

import { MERGE_CHANNEL_NAME } from "@/inngest/channels/merge"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { GitMergeIcon } from "lucide-react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchMergeRealtimeToken } from "./actions"
import { MergeDialog, type MergeFormValues } from "./dialog"

type mergeNodeData = Partial<MergeFormValues>

type MergeNodeType = Node<mergeNodeData>

export const MergeNode = memo((props: NodeProps<MergeNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: MERGE_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchMergeRealtimeToken,
    })

    const handleSubmit = (values: MergeFormValues) => {
        setNodes((nodes) => nodes.map((node) =>
            node.id === props.id
                ? { ...node, data: { ...node.data, ...values } }
                : node
        ))
    }

    const description = props.data?.waitForAll === false
        ? "first branch through"
        : "waits for every branch"

    return (
        <>
            <MergeDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={props.data}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon={GitMergeIcon}
                name="Merge"
                status={nodeStatus}
                description={description}
                onSettings={() => SetDialogOpen(true)}
                onDoubleClick={() => SetDialogOpen(true)}
            />
        </>
    )
})

MergeNode.displayName = "MergeNode"

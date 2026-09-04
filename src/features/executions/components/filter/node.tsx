"use client"

import { FILTER_CHANNEL_NAME } from "@/inngest/channels/filter"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { FilterIcon } from "lucide-react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchFilterRealtimeToken } from "./actions"
import { FilterDialog, type FilterFormValues } from "./dialog"

type filterNodeData = Partial<FilterFormValues>

type FilterNodeType = Node<filterNodeData>

export const FilterNode = memo((props: NodeProps<FilterNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: FILTER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchFilterRealtimeToken,
    })

    const handleSubmit = (values: FilterFormValues) => {
        setNodes((nodes) => nodes.map((node) =>
            node.id === props.id
                ? { ...node, data: { ...node.data, ...values } }
                : node
        ))
    }

    const count = props.data?.conditions?.length ?? 0
    const description = count
        ? `${count} condition${count === 1 ? "" : "s"}`
        : "Not configured"

    return (
        <>
            <FilterDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={props.data}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon={FilterIcon}
                name="Filter"
                status={nodeStatus}
                description={description}
                onSettings={() => SetDialogOpen(true)}
                onDoubleClick={() => SetDialogOpen(true)}
            />
        </>
    )
})

FilterNode.displayName = "FilterNode"

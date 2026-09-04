"use client"

import { WAIT_CHANNEL_NAME } from "@/inngest/channels/wait"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { ClockIcon } from "lucide-react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchWaitRealtimeToken } from "./actions"
import { WaitDialog, type WaitFormValues } from "./dialog"

type waitNodeData = Partial<WaitFormValues>

type WaitNodeType = Node<waitNodeData>

export const WaitNode = memo((props: NodeProps<WaitNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: WAIT_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchWaitRealtimeToken,
    })

    const handleSubmit = (values: WaitFormValues) => {
        setNodes((nodes) => nodes.map((node) =>
            node.id === props.id
                ? { ...node, data: { ...node.data, ...values } }
                : node
        ))
    }

    const data = props.data
    const description = data?.mode === "until"
        ? `until ${data.until ?? "?"}`
        : data?.amount
            ? `${data.amount} ${data.unit ?? "hours"}`
            : "Not configured"

    return (
        <>
            <WaitDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={props.data}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon={ClockIcon}
                name="Wait"
                status={nodeStatus}
                description={description}
                onSettings={() => SetDialogOpen(true)}
                onDoubleClick={() => SetDialogOpen(true)}
            />
        </>
    )
})

WaitNode.displayName = "WaitNode"

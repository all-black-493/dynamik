"use client"

import { ODOO_CHANNEL_NAME } from "@/inngest/channels/odoo"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchOdooRealtimeToken } from "./actions"
import { OdooDialog, type OdooFormValues } from "./dialog"

type odooNodeData = Partial<OdooFormValues>

type OdooNodeType = Node<odooNodeData>

export const OdooNode = memo((props: NodeProps<OdooNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: ODOO_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchOdooRealtimeToken,
    })

    const handleSubmit = (values: OdooFormValues) => {
        setNodes((nodes) => nodes.map((node) =>
            node.id === props.id
                ? { ...node, data: { ...node.data, ...values } }
                : node
        ))
    }

    const data = props.data
    const description = data?.model
        ? `${data.operation ?? "SEARCH_READ"} ${data.model}`
        : "Not configured"

    return (
        <>
            <OdooDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={data}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/odoo.svg"
                name="Odoo"
                status={nodeStatus}
                description={description}
                onSettings={() => SetDialogOpen(true)}
                onDoubleClick={() => SetDialogOpen(true)}
            />
        </>
    )
})

OdooNode.displayName = "OdooNode"

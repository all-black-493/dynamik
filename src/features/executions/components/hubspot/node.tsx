"use client"

import { HUBSPOT_CHANNEL_NAME } from "@/inngest/channels/hubspot"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchHubspotRealtimeToken } from "./actions"
import { HubspotDialog, type HubspotFormValues } from "./dialog"

type hubspotNodeData = {
    variableName?: string;
    credentialId?: string;
    operation?: string;
    objectType?: string;
    path?: string;
}

type HubspotNodeType = Node<hubspotNodeData>

export const HubspotNode = memo((props: NodeProps<HubspotNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)

    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: HUBSPOT_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchHubspotRealtimeToken,
    })

    const handleOpenSettings = () => SetDialogOpen(true)

    const handleSubmit = (values: HubspotFormValues) => {
        setNodes((nodes) => nodes.map((node) => {
            if (node.id === props.id) {
                return { ...node, data: { ...node.data, ...values } }
            }
            return node
        }))
    }

    const nodeData = props.data

    const target = nodeData?.operation === "RAW"
        ? nodeData.path
        : nodeData?.objectType

    const description = nodeData?.operation
        ? `${nodeData.operation} ${(target ?? "").slice(0, 40)}`
        : "Not configured"

    return (
        <>
            <HubspotDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData as Partial<HubspotFormValues>}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/hubspot.svg"
                name="Hubspot"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
})

HubspotNode.displayName = "HubspotNode"

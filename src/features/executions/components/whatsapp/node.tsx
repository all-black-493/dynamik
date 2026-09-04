"use client"

import { WHATSAPP_CHANNEL_NAME } from "@/inngest/channels/whatsapp"
import { Node, NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchWhatsappRealtimeToken } from "./actions"
import { WhatsappDialog, WhatsappFormValues } from "./dialog"

type whatsappNodeData = {
    variableName?: string;
    credentialId?: string;
    phoneNumberId?: string;
    recipient?: string;
    content?: string;
    previewUrl?: boolean;
}

type WhatsappNodeType = Node<whatsappNodeData>

export const WhatsappNode = memo((props: NodeProps<WhatsappNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)

    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: WHATSAPP_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchWhatsappRealtimeToken,
    })

    const handleOpenSettings = () => SetDialogOpen(true)

    const handleSubmit = (values: WhatsappFormValues) => {
        setNodes((nodes) => nodes.map((node) => {
            if (node.id === props.id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...values,
                    }
                }
            }
            return node
        }))
    }

    const nodeData = props.data
    const description = nodeData?.recipient
        ? `To ${nodeData.recipient}: ${(nodeData.content ?? "").slice(0, 40)} ...`
        : "Not configured"


    return (
        <>
            <WhatsappDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/whatsapp.svg"
                name="Whatsapp"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
})

WhatsappNode.displayName = "WhatsappNode"


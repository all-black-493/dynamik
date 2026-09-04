"use client"

import { TIKTOK_CHANNEL_NAME } from "@/inngest/channels/tiktok"
import { Node, NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchTiktokRealtimeToken } from "./actions"
import { TiktokDialog, TiktokFormValues } from "./dialog"

type tiktokNodeData = {
    variableName?: string;
    credentialId?: string;
    postMode?: "INBOX" | "DIRECT_POST";
    videoUrl?: string;
    title?: string;
    privacyLevel?: string;
    disableComment?: boolean;
    disableDuet?: boolean;
    disableStitch?: boolean;
}

type TiktokNodeType = Node<tiktokNodeData>

export const TiktokNode = memo((props: NodeProps<TiktokNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)

    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: TIKTOK_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchTiktokRealtimeToken,
    })

    const handleOpenSettings = () => SetDialogOpen(true)

    const handleSubmit = (values: TiktokFormValues) => {
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
    const description = nodeData?.videoUrl
        ? `${nodeData.postMode === "DIRECT_POST" ? "Publish" : "Draft"}: ${nodeData.videoUrl.slice(0, 40)} ...`
        : "Not configured"


    return (
        <>
            <TiktokDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/tiktok.svg"
                name="Tiktok"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
})

TiktokNode.displayName = "TiktokNode"


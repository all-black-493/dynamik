"use client"

import { DEEPSEEK_CHANNEL_NAME } from "@/inngest/channels/deepseek"
import { Node, NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchDeepseekRealtimeToken } from "./actions"
import { DeepseekDialog, DeepseekFormValues } from "./dialog"

type deepseekNodeData = {
    variableName?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;

}

type DeepseekNodeType = Node<deepseekNodeData>

export const DeepseekNode = memo((props: NodeProps<DeepseekNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)

    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: DEEPSEEK_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchDeepseekRealtimeToken,
    })

    const handleOpenSettings = () => SetDialogOpen(true)

    const handleSubmit = (values: DeepseekFormValues) => {
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
    const description = nodeData?.userPrompt
        ? `deepseek-chatting: ${nodeData.userPrompt.slice(0, 50)} ...`
        : "Not configured"


    return (
        <>
            <DeepseekDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/deepseek.svg"
                name="Deepseek"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
})

DeepseekNode.displayName = "DeepseekNode"


"use client"

import { PERPLEXITY_CHANNEL_NAME } from "@/inngest/channels/perplexity"
import { Node, NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchPerplexityRealtimeToken } from "./actions"
import { PerplexityDialog, PerplexityFormValues } from "./dialog"

type perplexityNodeData = {
    variableName?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;

}

type PerplexityNodeType = Node<perplexityNodeData>

export const PerplexityNode = memo((props: NodeProps<PerplexityNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)

    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: PERPLEXITY_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchPerplexityRealtimeToken,
    })

    const handleOpenSettings = () => SetDialogOpen(true)

    const handleSubmit = (values: PerplexityFormValues) => {
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
        ? `sonar: ${nodeData.userPrompt.slice(0, 50)} ...`
        : "Not configured"


    return (
        <>
            <PerplexityDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/perplexity.svg"
                name="Perplexity"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
})

PerplexityNode.displayName = "PerplexityNode"


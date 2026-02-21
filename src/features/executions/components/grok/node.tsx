"use client"

import { GEMINI_CHANNEL_NAME } from "@/inngest/channels/gemini"
import { Node, NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchGrokRealtimeToken } from "./actions"
import { GrokDialog, GrokFormValues } from "./dialog"
import { GROK_CHANNEL_NAME } from "@/inngest/channels/grok"

type grokNodeData = {
    variableName?: string;
    model?: string ;
    systemPrompt?: string;
    userPrompt?: string;

}

type GrokNodeType = Node<grokNodeData>

export const GrokNode = memo((props: NodeProps<GrokNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)

    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: GROK_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchGrokRealtimeToken,
    })

    const handleOpenSettings = () => SetDialogOpen(true)

    const handleSubmit = (values: GrokFormValues) => {
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
        ? `grok-4: ${nodeData.userPrompt.slice(0, 50)} ...`
        : "Not configured"


    return (
        <>
            <GrokDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/grok.svg"
                name="Grok"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
})

GrokNode.displayName = "GrokNode"


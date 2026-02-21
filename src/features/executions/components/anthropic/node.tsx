"use client"

import { ANTHROPIC_CHANNEL_NAME } from "@/inngest/channels/anthropic"
import { Node, NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchAnthropicRealtimeToken } from "./actions"
import { AnthropicDialog, AnthropicFormValues } from "./dialog"

type anthropicNodeData = {
    variableName?: string;
    model?: string ;
    systemPrompt?: string;
    userPrompt?: string;

}

type AnthropicNodeType = Node<anthropicNodeData>

export const AnthropicNode = memo((props: NodeProps<AnthropicNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)

    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: ANTHROPIC_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchAnthropicRealtimeToken,
    })

    const handleOpenSettings = () => SetDialogOpen(true)

    const handleSubmit = (values: AnthropicFormValues) => {
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
        ? `claude-sonnet: ${nodeData.userPrompt.slice(0, 50)} ...`
        : "Not configured"


    return (
        <>
            <AnthropicDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/anthropic.svg"
                name="Anthropic"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
})

AnthropicNode.displayName = "AnthropicNode"


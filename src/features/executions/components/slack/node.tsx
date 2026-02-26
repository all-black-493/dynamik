"use client"

import { SLACK_CHANNEL_NAME } from "@/inngest/channels/slack"
import { Node, NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchSlackRealtimeToken } from "./actions"
import { SlackDialog, SlackFormValues } from "./dialog"

type slackNodeData = {
    webhookUrl?: string
    content?: string

}

type slackNodeType = Node<slackNodeData>

export const SlackNode = memo((props: NodeProps<slackNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)

    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: SLACK_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchSlackRealtimeToken,
    })

    const handleOpenSettings = () => SetDialogOpen(true)

    const handleSubmit = (values: SlackFormValues) => {
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
    const description = nodeData?.content
        ? `Send ${nodeData.content.slice(0, 50)} ...`
        : "Not configured"


    return (
        <>
            <SlackDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/slack.svg"
                name="Slack"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
})

SlackNode.displayName = "SlackNode"


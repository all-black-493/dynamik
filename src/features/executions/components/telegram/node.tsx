"use client"

import { TELEGRAM_CHANNEL_NAME } from "@/inngest/channels/telegram"
import { Node, NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchTelegramRealtimeToken } from "./actions"
import { TelegramDialog, TelegramFormValues } from "./dialog"

type telegramNodeData = {
    variableName?: string;
    webhookUrl?: string;
    content?: string;
    chat_id?: string;
}

type TelegramNodeType = Node<telegramNodeData>

export const TelegramNode = memo((props: NodeProps<TelegramNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)

    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: TELEGRAM_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchTelegramRealtimeToken,
    })

    const handleOpenSettings = () => SetDialogOpen(true)

    const handleSubmit = (values: TelegramFormValues) => {
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
            <TelegramDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/telegram.svg"
                name="Telegram"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
})

TelegramNode.displayName = "TelegramNode"


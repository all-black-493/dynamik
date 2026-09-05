"use client"

import { CODE_CHANNEL_NAME } from "@/inngest/channels/code"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { CodeIcon } from "lucide-react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchCodeRealtimeToken } from "./actions"
import { CodeDialog, type CodeFormValues } from "./dialog"

type codeNodeData = Partial<CodeFormValues>

type CodeNodeType = Node<codeNodeData>

export const CodeNode = memo((props: NodeProps<CodeNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: CODE_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchCodeRealtimeToken,
    })

    const handleSubmit = (values: CodeFormValues) => {
        setNodes((nodes) => nodes.map((node) =>
            node.id === props.id
                ? { ...node, data: { ...node.data, ...values } }
                : node
        ))
    }

    const lines = props.data?.code?.trim().split("\n").length ?? 0
    const description = lines
        ? `${lines} line${lines === 1 ? "" : "s"}`
        : "Not configured"

    return (
        <>
            <CodeDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={props.data}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon={CodeIcon}
                name="Code"
                status={nodeStatus}
                description={description}
                onSettings={() => SetDialogOpen(true)}
                onDoubleClick={() => SetDialogOpen(true)}
            />
        </>
    )
})

CodeNode.displayName = "CodeNode"

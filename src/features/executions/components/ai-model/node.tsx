"use client"

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import { AttachmentNode } from "../shared/attachment-node"
import { AiModelDialog, type AiModelFormValues, PROVIDERS } from "./dialog"

type AiModelNodeType = Node<Partial<AiModelFormValues>>

export const AiModelNode = memo((props: NodeProps<AiModelNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()

    const handleSubmit = (values: AiModelFormValues) => {
        setNodes((nodes) => nodes.map((node) =>
            node.id === props.id ? { ...node, data: { ...node.data, ...values } } : node
        ))
    }

    const data = props.data
    const provider = PROVIDERS.find((p) => p.value === data?.provider)
    const description = data?.model
        ? `${provider?.label ?? data.provider}: ${data.model}`
        : "Not configured"

    return (
        <>
            <AiModelDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={data}
            />
            <AttachmentNode
                id={props.id}
                label="Model"
                description={description}
                onOpen={() => setDialogOpen(true)}
            />
        </>
    )
})

AiModelNode.displayName = "AiModelNode"

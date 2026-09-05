"use client"

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import { AttachmentNode } from "../shared/attachment-node"
import { AiToolDialog, type AiToolFormValues } from "./dialog"

type AiToolNodeType = Node<Partial<AiToolFormValues>>

export const AiToolNode = memo((props: NodeProps<AiToolNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()

    const handleSubmit = (values: AiToolFormValues) => {
        setNodes((nodes) => nodes.map((node) =>
            node.id === props.id ? { ...node, data: { ...node.data, ...values } } : node
        ))
    }

    const description = props.data?.name
        ? `${props.data.method ?? "GET"} ${props.data.name}`
        : "Not configured"

    return (
        <>
            <AiToolDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={props.data}
            />
            <AttachmentNode
                id={props.id}
                label="Tool"
                description={description}
                onOpen={() => setDialogOpen(true)}
            />
        </>
    )
})

AiToolNode.displayName = "AiToolNode"

"use client"

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { MonitorIcon } from "lucide-react"
import { memo, useState } from "react"
import { BaseExecutionNode } from "../base-execution-node"
import { DisplayDialog, type DisplayFormValues } from "./dialog"
import { DisplayValue } from "./render"
import { useDisplayOutput } from "./use-display-output"

type displayNodeData = Partial<DisplayFormValues>

type DisplayNodeType = Node<displayNodeData>

export const DisplayNode = memo((props: NodeProps<DisplayNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()

    const { status, output } = useDisplayOutput(props.id)

    const handleSubmit = (values: DisplayFormValues) => {
        setNodes((nodes) => nodes.map((node) =>
            node.id === props.id
                ? { ...node, data: { ...node.data, ...values } }
                : node
        ))
    }

    const data = props.data
    const description = output?.title
        ?? data?.title
        ?? (data?.source ? `Shows ${data.source}` : "Not configured")

    return (
        <>
            <DisplayDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={data}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon={MonitorIcon}
                name="Display"
                status={status}
                description={description}
                onSettings={() => SetDialogOpen(true)}
                onDoubleClick={() => SetDialogOpen(true)}
            >
                {output && (
                    <div className="nodrag nowheel w-[320px] cursor-auto overflow-hidden rounded-md border bg-background p-2">
                        <DisplayValue value={output.value} />
                    </div>
                )}
            </BaseExecutionNode>
        </>
    )
})

DisplayNode.displayName = "DisplayNode"

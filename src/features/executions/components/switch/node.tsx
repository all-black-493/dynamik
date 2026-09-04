"use client"

import { SWITCH_CHANNEL_NAME } from "@/inngest/channels/switch"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { SplitIcon } from "lucide-react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchSwitchRealtimeToken } from "./actions"
import { SwitchDialog, type SwitchFormValues } from "./dialog"
import { SWITCH_FALLBACK_OUTPUT, type SwitchRule } from "./executor"

type switchNodeData = {
    variableName?: string;
    rules?: SwitchRule[];
    matchAll?: boolean;
    useFallback?: boolean;
}

type SwitchNodeType = Node<switchNodeData>

export const SwitchNode = memo((props: NodeProps<SwitchNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: SWITCH_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchSwitchRealtimeToken,
    })

    const handleSubmit = (values: SwitchFormValues) => {
        setNodes((nodes) => nodes.map((node) =>
            node.id === props.id
                ? { ...node, data: { ...node.data, ...values } }
                : node
        ))
    }

    const nodeData = props.data
    const rules = nodeData?.rules ?? []

    // One handle per rule, keyed by the rule's stable id so reordering rules in
    // the dialog does not rewire the canvas.
    const outputs = [
        ...rules.map((rule, index) => ({
            id: rule.id,
            label: rule.name || `rule ${index + 1}`
        })),
        ...(nodeData?.useFallback !== false
            ? [{ id: SWITCH_FALLBACK_OUTPUT, label: "else" }]
            : [])
    ]

    const description = rules.length
        ? `${rules.length} rule${rules.length === 1 ? "" : "s"}`
        : "Not configured"

    return (
        <>
            <SwitchDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData as Partial<SwitchFormValues>}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon={SplitIcon}
                name="Switch"
                status={nodeStatus}
                description={description}
                onSettings={() => SetDialogOpen(true)}
                onDoubleClick={() => SetDialogOpen(true)}
                outputs={outputs.length ? outputs : undefined}
            />
        </>
    )
})

SwitchNode.displayName = "SwitchNode"

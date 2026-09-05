"use client"

import { Position, useReactFlow, type NodeProps } from "@xyflow/react"
import type { LucideIcon } from "lucide-react"
import Image from "next/image"
import { memo, type ReactNode } from "react"
import { BaseNode, BaseNodeContent } from "../../../components/react-flow/base-node"
import { BaseHandle } from "../../../components/react-flow/base-handle"
import { DEFAULT_INPUT, DEFAULT_OUTPUT } from "@/features/executions/lib/outputs"
import WorkflowNode from "../../../components/workflow-node"
import { type NodeStatus, NodeStatusIndicator } from "@/components/react-flow/node-status-indicator"


interface BaseExecutionNodeProps extends NodeProps {
    icon: LucideIcon | string
    name: string
    description?: string
    children?: ReactNode
    status?: NodeStatus
    onSettings?: () => void
    onDoubleClick?: () => void
    /**
     * Named outputs for a branching node. The handle id becomes the connection's
     * fromOutput, which is what the engine matches when deciding which edges to
     * follow. Omitted for ordinary nodes, which get one unnamed output.
     */
    outputs?: { id: string; label: string }[]
    /**
     * Hides the output handle entirely, for a node nothing can follow.
     *
     * The canvas is the contract here: a node with no outgoing connection point
     * cannot be wired onwards, so the shape of the graph says what the node is.
     */
    terminal?: boolean
}

export const BaseExecutionNode = memo(({
    id,
    icon: Icon,
    name,
    description,
    children,
    status = "initial",
    onSettings,
    onDoubleClick,
    outputs,
    terminal
}: BaseExecutionNodeProps) => {

    const { setNodes, setEdges } = useReactFlow()

    const handleDelete = () => {
        setNodes((currentNodes) => {
            const updatedNodes = currentNodes.filter((node) => node.id !== id)
            return updatedNodes
        })

        setEdges((currentEdges) => {
            const updatedEdges = currentEdges.filter((edge) => edge.source !== id && edge.target !== id)
            return updatedEdges
        })
    }
    return (
        <WorkflowNode
            name={name}
            description={description}
            onDelete={handleDelete}
            onSettings={onSettings}
        >
            <NodeStatusIndicator
                status={status}
                variant="border"
            >
                <BaseNode
                    status={status}
                    onDoubleClick={onDoubleClick}
                    // Handles are spread over the node's height, so a node with
                    // several outputs needs enough of it for the labels to clear
                    // one another.
                    style={
                        outputs && outputs.length > 1
                            ? { minHeight: outputs.length * 26 + 20 }
                            : undefined
                    }
                >
                    <BaseNodeContent>
                        {typeof Icon === "string" ? (
                            <Image src={Icon} alt={name} width={16} height={16} />
                        ) : (
                            <Icon className="size-4 text-muted-foreground" />
                        )}

                        {children}
                        <BaseHandle
                            id={DEFAULT_INPUT}
                            type="target"
                            position={Position.Left}
                        />
                        {terminal ? null : outputs?.length ? (
                            outputs.map((output, index) => (
                                <BaseHandle
                                    key={output.id}
                                    id={output.id}
                                    type="source"
                                    position={Position.Right}
                                    style={{
                                        top: `${((index + 1) * 100) / (outputs.length + 1)}%`
                                    }}
                                >
                                    {/*
                                      A label belongs to its handle, so it is
                                      small, muted and set on a chip. Left plain
                                      it read as stray prose beside the node,
                                      and two of them ran together.
                                    */}
                                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 whitespace-nowrap rounded bg-background/90 px-1 py-px font-medium text-[9px] text-muted-foreground uppercase tracking-wide">
                                        {output.label}
                                    </span>
                                </BaseHandle>
                            ))
                        ) : (
                            <BaseHandle
                                id={DEFAULT_OUTPUT}
                                type="source"
                                position={Position.Right}
                            />
                        )}
                    </BaseNodeContent>
                </BaseNode>
            </NodeStatusIndicator>
        </WorkflowNode>
    )
}
)

BaseExecutionNode.displayName = "BaseExecutionNode"
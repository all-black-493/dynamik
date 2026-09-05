"use client"

import { Button } from "@/components/ui/button"
import { AI_AGENT_CHANNEL_NAME } from "@/inngest/channels/ai-agent"
import { NodeType } from "@/generated/prisma"
import { createId } from "@paralleldrive/cuid2"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { BotIcon, PlusIcon } from "lucide-react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchAiAgentRealtimeToken } from "./actions"
import { AiAgentDialog, type AiAgentFormValues } from "./dialog"

type aiAgentNodeData = Partial<AiAgentFormValues>

type AiAgentNodeType = Node<aiAgentNodeData>

/** Docked children sit below the agent, offset so several sit side by side. */
const CHILD_OFFSET_Y = 150
const CHILD_SPACING_X = 170

export const AiAgentNode = memo((props: NodeProps<AiAgentNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)
    const { setNodes, getNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: AI_AGENT_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchAiAgentRealtimeToken,
    })

    const handleSubmit = (values: AiAgentFormValues) => {
        setNodes((nodes) => nodes.map((node) =>
            node.id === props.id
                ? { ...node, data: { ...node.data, ...values } }
                : node
        ))
    }

    /**
     * Adds an attachment.
     *
     * Children are created from the agent rather than dragged onto it, so the
     * relationship exists from the moment the node does and cannot be left
     * half-formed on the canvas.
     */
    const attach = (type: NodeType) => {
        const existing = getNodes().filter(
            (node) => (node as { parentId?: string }).parentId === props.id
        ).length

        setNodes((current) => [
            ...current,
            {
                id: createId(),
                type,
                // A child's position is relative to its parent, not to the
                // canvas. Using absolute coordinates here placed it roughly
                // twice as far away as intended, usually off screen, which is
                // why adding one looked like nothing happening.
                position: {
                    x: existing * CHILD_SPACING_X,
                    y: CHILD_OFFSET_Y
                },
                data: {},
                // React Flow's field. The workflow save maps it to
                // parentNodeId, which is what the engine reads.
                parentId: props.id
            } as Node
        ])
    }

    const attached = getNodes().filter(
        (node) => (node as { parentId?: string }).parentId === props.id
    )
    const hasModel = attached.some((node) => node.type === NodeType.AI_MODEL)
    const toolCount = attached.filter((node) => node.type === NodeType.AI_TOOL).length

    const description = props.data?.userPrompt
        ? `${hasModel ? "" : "No model. "}${toolCount} tool${toolCount === 1 ? "" : "s"}`
        : "Not configured"

    return (
        <>
            <AiAgentDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={props.data}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon={BotIcon}
                name="AI Agent"
                status={nodeStatus}
                description={description}
                onSettings={() => SetDialogOpen(true)}
                onDoubleClick={() => SetDialogOpen(true)}
            >
                <div className="nodrag mt-2 flex gap-1">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => attach(NodeType.AI_MODEL)}
                        disabled={hasModel}
                    >
                        <PlusIcon className="size-3" />
                        Model
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => attach(NodeType.AI_TOOL)}
                    >
                        <PlusIcon className="size-3" />
                        Tool
                    </Button>
                </div>
            </BaseExecutionNode>
        </>
    )
})

AiAgentNode.displayName = "AiAgentNode"

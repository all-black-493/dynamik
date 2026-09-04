"use client"

import { POSTGRES_CHANNEL_NAME } from "@/inngest/channels/postgres"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchPostgresRealtimeToken } from "./actions"
import { PostgresDialog, type PostgresFormValues } from "./dialog"

type postgresNodeData = Partial<PostgresFormValues>

type PostgresNodeType = Node<postgresNodeData>

export const PostgresNode = memo((props: NodeProps<PostgresNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: POSTGRES_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchPostgresRealtimeToken,
    })

    const handleSubmit = (values: PostgresFormValues) => {
        setNodes((nodes) => nodes.map((node) =>
            node.id === props.id
                ? { ...node, data: { ...node.data, ...values } }
                : node
        ))
    }

    const data = props.data
    const sql = data?.operation === "TRANSACTION" ? data.statements : data?.sql
    const description = sql
        ? `${data?.operation ?? "QUERY"}: ${sql.replace(/\s+/g, " ").slice(0, 40)}`
        : "Not configured"

    return (
        <>
            <PostgresDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={data}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/postgresql.svg"
                name="Postgres"
                status={nodeStatus}
                description={description}
                onSettings={() => SetDialogOpen(true)}
                onDoubleClick={() => SetDialogOpen(true)}
            />
        </>
    )
})

PostgresNode.displayName = "PostgresNode"

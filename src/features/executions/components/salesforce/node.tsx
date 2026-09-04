"use client"

import { SALESFORCE_CHANNEL_NAME } from "@/inngest/channels/salesforce"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { memo, useState } from "react"
import useNodeStatus from "../../hooks/use-node-status"
import { BaseExecutionNode } from "../base-execution-node"
import { fetchSalesforceRealtimeToken } from "./actions"
import { SalesforceDialog, type SalesforceFormValues } from "./dialog"

type salesforceNodeData = {
    variableName?: string;
    credentialId?: string;
    operation?: string;
    soql?: string;
    sobject?: string;
    path?: string;
}

type SalesforceNodeType = Node<salesforceNodeData>

export const SalesforceNode = memo((props: NodeProps<SalesforceNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)

    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: SALESFORCE_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchSalesforceRealtimeToken,
    })

    const handleOpenSettings = () => SetDialogOpen(true)

    const handleSubmit = (values: SalesforceFormValues) => {
        setNodes((nodes) => nodes.map((node) => {
            if (node.id === props.id) {
                return { ...node, data: { ...node.data, ...values } }
            }
            return node
        }))
    }

    const nodeData = props.data

    const summary = nodeData?.operation === "QUERY"
        ? nodeData.soql
        : nodeData?.operation === "RAW"
            ? nodeData.path
            : nodeData?.sobject

    const description = nodeData?.operation
        ? `${nodeData.operation}: ${(summary ?? "").slice(0, 40)} ...`
        : "Not configured"

    return (
        <>
            <SalesforceDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData as Partial<SalesforceFormValues>}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/salesforce.svg"
                name="Salesforce"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
})

SalesforceNode.displayName = "SalesforceNode"

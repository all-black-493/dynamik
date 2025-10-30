"use client"

import { useReactFlow, NodeProps, Node } from "@xyflow/react"
import { Globe2Icon, GlobeIcon } from "lucide-react"
import { memo, useState } from "react"
import { BaseExecutionNode } from "../base-execution-node"
import { FormType, HttpRequestDialog } from "./dialog"

type HttpRequestNodeData = {
    endpoint?: string
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    body?: string
    [key: string]: unknown
}

type HttpRequestNodeType = Node<HttpRequestNodeData>

export const HttpRequestNode = memo((props: NodeProps<HttpRequestNodeType>) => {

    const [dialogOpen, SetDialogOpen] = useState(false)

    const { setNodes } = useReactFlow()

    const nodeStatus = "initial"

    const handleOpenSettings = () => SetDialogOpen(true)

    const handleSubmit = (values: FormType) => {
        setNodes((nodes) => nodes.map((node) => {
            if (node.id === props.id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        endpoint: values.endpoint,
                        method: values.method,
                        body: values.body,
                    }
                }
            }
            return node
        }))
    }

    const nodeData = props.data
    const description = nodeData?.endpoint
        ? `${nodeData.method || "GET"}: ${nodeData.endpoint}`
        : "Not configured"


    return (
        <>
            <HttpRequestDialog
                open={dialogOpen}
                onOpenChange={SetDialogOpen}
                onSubmit={handleSubmit}
                defaultEndpoint={nodeData.endpoint}
                defaultMethod={nodeData.method}
                defaultBody={nodeData.body}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon={GlobeIcon}
                name="HTTP Request"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
})

HttpRequestNode.displayName = "HttpRequestNode"


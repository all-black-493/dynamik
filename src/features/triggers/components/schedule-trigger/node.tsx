"use client"

import useNodeStatus from "@/features/executions/hooks/use-node-status"
import { SCHEDULE_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/schedule-trigger"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { CalendarClockIcon } from "lucide-react"
import { memo, useState } from "react"
import { BaseTriggerNode } from "../base-trigger-node"
import { fetchScheduleTriggerRealtimeToken } from "./actions"
import { ScheduleTriggerDialog, type ScheduleTriggerFormValues } from "./dialog"

type ScheduleNodeType = Node<Partial<ScheduleTriggerFormValues>>

const ScheduleTriggerNode = memo((props: NodeProps<ScheduleNodeType>) => {

    const [dialogOpen, setDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: SCHEDULE_TRIGGER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchScheduleTriggerRealtimeToken,
    })

    const handleSubmit = (values: ScheduleTriggerFormValues) => {
        setNodes((nodes) => nodes.map((node) =>
            node.id === props.id ? { ...node, data: { ...node.data, ...values } } : node
        ))
    }

    const data = props.data
    const description = data?.cron
        ? `${data.enabled === false ? "Paused: " : ""}${data.cron} ${data.timezone ?? "UTC"}`
        : "Not configured"

    return (
        <>
            <ScheduleTriggerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={data}
            />
            <BaseTriggerNode
                {...props}
                icon={CalendarClockIcon}
                name="On a schedule"
                status={nodeStatus}
                description={description}
                onSettings={() => setDialogOpen(true)}
                onDoubleClick={() => setDialogOpen(true)}
            />
        </>
    )
})

ScheduleTriggerNode.displayName = "ScheduleTriggerNode"

export default ScheduleTriggerNode

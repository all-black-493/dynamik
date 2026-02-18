import useNodeStatus from '@/features/executions/hooks/use-node-status'
import { MPESA_TRIGGER_CHANNEL_NAME } from '@/inngest/channels/mpesa-trigger'
import { NodeProps } from '@xyflow/react'
import { memo, useState } from 'react'
import { BaseTriggerNode } from '../base-trigger-node'
import { fetchMPESARealtimeToken } from './actions'
import { MPESATriggerDialog } from './dialog'

const MPESATrigger = memo((props: NodeProps) => {

    const [dialogOpen, setDialogOpen] = useState(false)
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: MPESA_TRIGGER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchMPESARealtimeToken
    });
    const handleOpenSettings = () => setDialogOpen(true)
    return (
        <>
            <MPESATriggerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
            <BaseTriggerNode
                {...props}
                icon={"/logos/mpesa.png"}
                name="M-PESA"
                description='When M-PESA event is captured'
                status={nodeStatus}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
}
)

export default MPESATrigger

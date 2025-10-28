import { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseTriggerNode } from '../base-trigger-node'
import { MousePointerIcon } from 'lucide-react'

const ManualTriggerNode = memo((props: NodeProps) => {
    return (
        <>
            <BaseTriggerNode
                {...props}
                icon={MousePointerIcon}
                name="When clicking 'Execute workflow' "
            />
        </>
    )
}
)

export default ManualTriggerNode

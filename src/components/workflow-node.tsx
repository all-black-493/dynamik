"use client"

import { NodeToolbar, Position } from '@xyflow/react'
import React, { ReactNode } from 'react'
import { Button } from './ui/button'
import { SettingsIcon, Trash2Icon } from 'lucide-react'

interface WorkflowNodeProps {
    children: ReactNode
    showToolbar?: boolean
    onDelete?: () => void
    onSettings?: () => void
    name?: string
    description?: string
}
const WorkflowNode = ({
    children,
    showToolbar = true,
    onDelete,
    onSettings,
    name,
    description
}: WorkflowNodeProps) => {
    return (
        <>
            {showToolbar && (
                <NodeToolbar>
                    <Button size="sm" variant="ghost" onClick={onSettings}>
                        <SettingsIcon className='size-4' />
                    </Button>

                    <Button size="sm" variant="ghost" onClick={onDelete}>
                        <Trash2Icon className='size-4' />
                    </Button>
                </NodeToolbar>
            )}

            {children}
            {name && (
                <NodeToolbar
                    position={Position.Bottom}
                    isVisible
                    className='max-w-[200px] text-center'
                >
                    <p className="font-medium">
                        {name}
                    </p>
                    {description && (
                        <p className="text-muted-foreground truncate text-sm">
                            {description}
                        </p>
                    )}

                </NodeToolbar>
            )}
        </>
    )
}

export default WorkflowNode

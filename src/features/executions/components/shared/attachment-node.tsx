"use client"

import { cn } from "@/lib/utils"
import { useReactFlow } from "@xyflow/react"
import { SettingsIcon, XIcon } from "lucide-react"

/**
 * A node docked to another node.
 *
 * Deliberately unlike a flow node: no handles, because an attachment is never
 * connected to anything. It belongs to its parent, and the canvas should not
 * invite anyone to wire it into the run.
 */
export const AttachmentNode = ({
    id,
    label,
    description,
    onOpen
}: {
    id: string
    label: string
    description: string
    onOpen: () => void
}) => {
    const { setNodes } = useReactFlow()

    const remove = () => setNodes((nodes) => nodes.filter((node) => node.id !== id))

    const configured = description !== "Not configured"

    return (
        <button
            type="button"
            onDoubleClick={onOpen}
            className={cn(
                "group w-[150px] rounded-md border border-dashed bg-background px-3 py-2 text-left",
                configured ? "border-border" : "border-muted-foreground/40"
            )}
        >
            <div className="flex items-center justify-between">
                <span className="font-medium text-xs">{label}</span>
                <span className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <SettingsIcon
                        className="size-3 text-muted-foreground"
                        onClick={(event) => {
                            event.stopPropagation()
                            onOpen()
                        }}
                    />
                    <XIcon
                        className="size-3 text-muted-foreground"
                        onClick={(event) => {
                            event.stopPropagation()
                            remove()
                        }}
                    />
                </span>
            </div>
            <p className="truncate text-[10px] text-muted-foreground">{description}</p>
        </button>
    )
}

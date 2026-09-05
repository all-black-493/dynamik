"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { useUpgradeModal } from "@/hooks/use-upgrade-modal"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { LayoutTemplateIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

/**
 * Starts a workflow from a prebuilt one.
 *
 * Templates are the same nodes anyone could place by hand, so what appears is a
 * working workflow to adapt rather than a demo to admire. Each says up front
 * what it still needs, since a template cannot bring credentials with it.
 */
export const TemplatePicker = () => {
    const [open, setOpen] = useState(false)
    const trpc = useTRPC()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { handleError, modal } = useUpgradeModal()

    const { data: templates, isLoading } = useQuery({
        ...trpc.workflows.listTemplates.queryOptions(),
        enabled: open
    })

    const create = useMutation(
        trpc.workflows.createFromTemplate.mutationOptions({
            onSuccess: (workflow) => {
                queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}))
                toast.success(`Created "${workflow.name}"`)
                router.push(`/workflows/${workflow.id}`)
            },
            onError: (error) => handleError(error)
        })
    )

    return (
        <>
            {modal}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <LayoutTemplateIcon className="size-4" />
                        Start from a template
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Templates</DialogTitle>
                        <DialogDescription>
                            Working workflows to adapt. Each one opens in the editor.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 space-y-3">
                        {isLoading && (
                            <p className="text-muted-foreground text-sm">Loading...</p>
                        )}

                        {templates?.map((template) => (
                            <button
                                type="button"
                                key={template.id}
                                disabled={create.isPending}
                                onClick={() => create.mutate({ templateId: template.id })}
                                className="w-full rounded-lg border p-4 text-left transition hover:border-primary disabled:opacity-60"
                            >
                                <div className="flex items-baseline justify-between gap-4">
                                    <span className="font-medium text-sm">{template.name}</span>
                                    <span className="shrink-0 text-muted-foreground text-xs">
                                        {template.nodeCount} nodes
                                    </span>
                                </div>
                                <p className="mt-1 text-muted-foreground text-xs">
                                    {template.summary}
                                </p>
                                {template.requires.length > 0 && (
                                    <p className="mt-2 text-[11px] text-muted-foreground">
                                        Needs: {template.requires.join(", ")}
                                    </p>
                                )}
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

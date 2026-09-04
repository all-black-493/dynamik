"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const formSchema = z.object({
    variableName: z.string().regex(/^$|^[A-Za-z_$][A-Za-z0-9_$]*$/, {
        error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
    }).optional(),
    waitForAll: z.boolean()
})

export type MergeFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: MergeFormValues) => void
    defaultValues?: Partial<MergeFormValues>;
}

export const MergeDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {

    const form = useForm<MergeFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || "",
            waitForAll: defaultValues.waitForAll ?? true
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                waitForAll: defaultValues.waitForAll ?? true
            })
        }
    }, [open, defaultValues, form])

    const handleSubmit = (values: MergeFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Merge Configuration</DialogTitle>
                    <DialogDescription>
                        Bring branches back together before carrying on
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
                        <FormField
                            control={form.control}
                            name="waitForAll"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-1 pr-6">
                                        <FormLabel>Wait for every input</FormLabel>
                                        <FormDescription>
                                            On, this node runs once all incoming connections have
                                            arrived, so a branch that was never taken stops the merge.
                                            Off, the first branch to arrive is enough.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name (optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value ?? ""} placeholder="myMerge" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        Data from every branch is already in the workflow, so this node
                                        does not copy it. Later nodes read the earlier variables directly.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="mt-6">
                            <Button type="submit">Save Configuration</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

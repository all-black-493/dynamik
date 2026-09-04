"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const formSchema = z.object({
    variableName: z
        .string()
        .min(1, { error: "Variable name is required" })
        .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
            error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
        }),
    itemsPath: z.string().min(1, "Items path is required"),
    maxItems: z.string().optional()
})

export type LoopFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: LoopFormValues) => void
    defaultValues?: Partial<LoopFormValues>;
}

export const LoopDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {}
}: Props) => {

    const form = useForm<LoopFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || "",
            itemsPath: defaultValues.itemsPath || "",
            maxItems: defaultValues.maxItems || ""
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                itemsPath: defaultValues.itemsPath || "",
                maxItems: defaultValues.maxItems || ""
            })
        }
    }, [open, defaultValues, form])

    const watchVariableName = form.watch("variableName") || "myLoop"

    const handleSubmit = (values: LoopFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Loop Configuration</DialogTitle>
                    <DialogDescription>
                        The each branch repeats per item, then done runs once. No return
                        connection needed.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
                        <FormField
                            control={form.control}
                            name="itemsPath"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Items</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="myQuery.result.records"
                                            className="font-mono"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Path to a list, written without braces.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="myLoop" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        Inside: {`{{${watchVariableName}.item}}`}. After:{" "}
                                        {`{{${watchVariableName}.results}}`}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="maxItems"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Maximum Items (optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="100" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        Defaults to 100, capped at 1000
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

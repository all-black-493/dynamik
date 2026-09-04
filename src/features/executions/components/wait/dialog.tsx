"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const formSchema = z.object({
    variableName: z.string().regex(/^$|^[A-Za-z_$][A-Za-z0-9_$]*$/, {
        error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
    }).optional(),
    mode: z.enum(["duration", "until"]),
    amount: z.string().optional(),
    unit: z.enum(["seconds", "minutes", "hours", "days"]),
    until: z.string().optional()
}).superRefine((values, ctx) => {
    if (values.mode === "duration") {
        const amount = Number(values.amount)
        if (!Number.isFinite(amount) || amount <= 0) {
            ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter a positive number" })
        }
    } else if (!values.until?.trim()) {
        ctx.addIssue({ code: "custom", path: ["until"], message: "Timestamp is required" })
    }
})

export type WaitFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: WaitFormValues) => void
    defaultValues?: Partial<WaitFormValues>;
}

export const WaitDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {

    const defaults = (): WaitFormValues => ({
        variableName: defaultValues.variableName || "",
        mode: defaultValues.mode || "duration",
        amount: defaultValues.amount || "1",
        unit: defaultValues.unit || "hours",
        until: defaultValues.until || ""
    })

    const form = useForm<WaitFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: defaults()
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                mode: defaultValues.mode || "duration",
                amount: defaultValues.amount || "1",
                unit: defaultValues.unit || "hours",
                until: defaultValues.until || ""
            })
        }
    }, [open, defaultValues, form])

    const mode = form.watch("mode")

    const handleSubmit = (values: WaitFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Wait Configuration</DialogTitle>
                    <DialogDescription>
                        Pause the run. Nothing is held open while it waits, so a workflow can
                        pause for days without anything running.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
                        <FormField
                            control={form.control}
                            name="mode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Wait</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="duration">For a length of time</SelectItem>
                                            <SelectItem value="until">Until a moment</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {mode === "duration" ? (
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Amount</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value ?? ""} placeholder="1" className="font-mono" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="unit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Unit</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {["seconds", "minutes", "hours", "days"].map((u) => (
                                                        <SelectItem key={u} value={u}>{u}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        ) : (
                            <FormField
                                control={form.control}
                                name="until"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Timestamp</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                value={field.value ?? ""}
                                                placeholder="{{myTrigger.dueAt}}"
                                                className="font-mono"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            An ISO date, or a variable holding one
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name (optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value ?? ""} placeholder="myWait" className="font-mono" />
                                    </FormControl>
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

"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const formSchema = z.object({
    variableName: z.string().min(1, { error: "Variable name is required" })
        .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
            error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
        }),
    systemPrompt: z.string().optional(),
    userPrompt: z.string().min(1, "Prompt is required"),
    maxSteps: z.string().optional()
})

export type AiAgentFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: AiAgentFormValues) => void
    defaultValues?: Partial<AiAgentFormValues>;
}

export const AiAgentDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {

    const form = useForm<AiAgentFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || "",
            systemPrompt: defaultValues.systemPrompt || "",
            userPrompt: defaultValues.userPrompt || "",
            maxSteps: defaultValues.maxSteps || ""
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                systemPrompt: defaultValues.systemPrompt || "",
                userPrompt: defaultValues.userPrompt || "",
                maxSteps: defaultValues.maxSteps || ""
            })
        }
    }, [open, defaultValues, form])

    const watchVariableName = form.watch("variableName") || "myAgent"

    const handleSubmit = (values: AiAgentFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>AI Agent Configuration</DialogTitle>
                    <DialogDescription>
                        Attach a Model, and any Tools it may call
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
                        <FormField
                            control={form.control}
                            name="systemPrompt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>System Prompt (optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            value={field.value ?? ""}
                                            className="min-h-[70px] font-mono text-sm"
                                            placeholder="You are a sales assistant. Use the tools before answering."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="userPrompt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Prompt</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            className="min-h-[100px] font-mono text-sm"
                                            placeholder="Summarise {{myQuery.rows}} and log anything unusual."
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Supports {"{{variables}}"} and {"{{json variable}}"}.
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
                                        <Input {...field} placeholder="myAgent" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        Answer at {`{{${watchVariableName}.text}}`}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="maxSteps"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Max Steps (optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value ?? ""} placeholder="8" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        How many times it may call a tool before answering. Defaults to 8.
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

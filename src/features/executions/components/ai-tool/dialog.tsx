"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const formSchema = z.object({
    name: z.string().min(1, "Name is required")
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
            error: "Use letters, numbers and underscores. The model calls the tool by this name."
        }),
    description: z.string().min(1, "Describe when to use it"),
    method: z.enum(["GET", "POST", "PATCH", "PUT", "DELETE"]),
    url: z.string().min(1, "URL is required"),
    parameters: z.string().optional(),
    headers: z.string().optional(),
    body: z.string().optional()
})

export type AiToolFormValues = z.infer<typeof formSchema>

const SAMPLE_PARAMS = `{
  "type": "object",
  "properties": {
    "query": { "type": "string", "description": "What to look up" }
  },
  "required": ["query"]
}`

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: AiToolFormValues) => void
    defaultValues?: Partial<AiToolFormValues>;
}

export const AiToolDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {

    const form = useForm<AiToolFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: defaultValues.name || "",
            description: defaultValues.description || "",
            method: defaultValues.method || "GET",
            url: defaultValues.url || "",
            parameters: defaultValues.parameters || SAMPLE_PARAMS,
            headers: defaultValues.headers || "",
            body: defaultValues.body || ""
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                name: defaultValues.name || "",
                description: defaultValues.description || "",
                method: defaultValues.method || "GET",
                url: defaultValues.url || "",
                parameters: defaultValues.parameters || SAMPLE_PARAMS,
                headers: defaultValues.headers || "",
                body: defaultValues.body || ""
            })
        }
    }, [open, defaultValues, form])

    const method = form.watch("method")

    const handleSubmit = (values: AiToolFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tool</DialogTitle>
                    <DialogDescription>
                        An HTTP call the agent may make on its own
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="lookup_customer" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>What the model calls it</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            className="min-h-[60px]"
                                            placeholder="Looks up a customer by email. Use before answering account questions."
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        This is how the model decides when to call it
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-4 gap-4">
                            <FormField
                                control={form.control}
                                name="method"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Method</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {["GET", "POST", "PATCH", "PUT", "DELETE"].map((m) => (
                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="url"
                                render={({ field }) => (
                                    <FormItem className="col-span-3">
                                        <FormLabel>URL</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="https://api.example.com/customers?email={{args.query}}"
                                                className="font-mono"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            The model's arguments are available as {"{{args}}"}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="parameters"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Parameters (JSON Schema)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            value={field.value ?? ""}
                                            className="min-h-[120px] font-mono text-sm"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        What the model must supply when calling this
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {method !== "GET" && (
                            <FormField
                                control={form.control}
                                name="body"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Body (JSON, optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                value={field.value ?? ""}
                                                className="min-h-[70px] font-mono text-sm"
                                                placeholder='{ "email": "{{args.query}}" }'
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="headers"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Headers (JSON, optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            value={field.value ?? ""}
                                            className="min-h-[60px] font-mono text-sm"
                                            placeholder='{ "Authorization": "Bearer ..." }'
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="mt-6">
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

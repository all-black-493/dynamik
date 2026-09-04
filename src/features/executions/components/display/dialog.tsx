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

const RENDERERS = [
    { value: "auto", label: "Work it out" },
    { value: "image", label: "Image" },
    { value: "video", label: "Video" },
    { value: "audio", label: "Audio" },
    { value: "table", label: "Table" },
    { value: "graph", label: "Graph" },
    { value: "markdown", label: "Markdown" },
    { value: "text", label: "Text" },
    { value: "json", label: "JSON" }
] as const

const formSchema = z.object({
    source: z.string().min(1, "Choose something to display"),
    title: z.string().optional(),
    renderAs: z.enum(["auto", "image", "video", "audio", "table", "graph", "markdown", "text", "json"]),
    variableName: z.string().regex(/^$|^[A-Za-z_$][A-Za-z0-9_$]*$/, {
        error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
    }).optional()
})

export type DisplayFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: DisplayFormValues) => void
    defaultValues?: Partial<DisplayFormValues>;
}

export const DisplayDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {

    const form = useForm<DisplayFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            source: defaultValues.source || "",
            title: defaultValues.title || "",
            renderAs: defaultValues.renderAs || "auto",
            variableName: defaultValues.variableName || ""
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                source: defaultValues.source || "",
                title: defaultValues.title || "",
                renderAs: defaultValues.renderAs || "auto",
                variableName: defaultValues.variableName || ""
            })
        }
    }, [open, defaultValues, form])

    const handleSubmit = (values: DisplayFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Display Configuration</DialogTitle>
                    <DialogDescription>
                        Show a result on the canvas as it is produced
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
                        <FormField
                            control={form.control}
                            name="source"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Show</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="myQuery.rows" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        A path into the workflow data, without braces
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="renderAs"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Render as</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {RENDERERS.map((renderer) => (
                                                <SelectItem key={renderer.value} value={renderer.value}>
                                                    {renderer.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        A list of records becomes a table, an image URL an image
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title (optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value ?? ""} placeholder="Customers this week" />
                                    </FormControl>
                                    <FormMessage />
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
                                        <Input {...field} value={field.value ?? ""} placeholder="myDisplay" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        Keeps it in the execution record too
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

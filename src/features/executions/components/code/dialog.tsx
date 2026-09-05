"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import dynamic from "next/dynamic"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import {
    CODE_LANGUAGES,
    CODE_SAMPLES,
    type CodeLanguage
} from "@/features/executions/lib/code-languages"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { z } from "zod"

// CodeMirror reaches for the DOM on import, so it is loaded in the browser only.
const CodeEditor = dynamic(
    () => import("./code-editor").then((module) => module.CodeEditor),
    {
        ssr: false,
        loading: () => (
            <div className="h-[260px] animate-pulse rounded-md border bg-muted/40" />
        )
    }
)

const formSchema = z.object({
    variableName: z.string().min(1, { error: "Variable name is required" })
        .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
            error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
        }),
    language: z.enum(["javascript", "typescript", "python", "r"]),
    code: z.string().min(1, "Code is required"),
    timeoutMs: z.string().optional()
})

export type CodeFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: CodeFormValues) => void
    defaultValues?: Partial<CodeFormValues>;
}

export const CodeDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {

    const form = useForm<CodeFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || "",
            language: defaultValues.language || "javascript",
            code: defaultValues.code || CODE_SAMPLES.javascript,
            timeoutMs: defaultValues.timeoutMs || ""
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                language: defaultValues.language || "javascript",
                code: defaultValues.code || CODE_SAMPLES[defaultValues.language || "javascript"],
                timeoutMs: defaultValues.timeoutMs || ""
            })
        }
    }, [open, defaultValues, form])

    const watchVariableName = form.watch("variableName") || "myCode"
    const language = form.watch("language")

    // Switching language swaps the sample, but only while the editor still holds
    // a sample: work someone has written is never replaced.
    const handleLanguageChange = (next: CodeLanguage) => {
        const current = form.getValues("code").trim()
        const isUntouched = Object.values(CODE_SAMPLES).some(
            (sample) => sample.trim() === current
        )

        form.setValue("language", next)
        if (isUntouched || !current) form.setValue("code", CODE_SAMPLES[next])
    }

    const handleSubmit = (values: CodeFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Code Configuration</DialogTitle>
                    <DialogDescription>
                        JavaScript over the workflow data, run in an isolated engine
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
                        <FormField
                            control={form.control}
                            name="language"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Language</FormLabel>
                                    <Select
                                        onValueChange={(value) =>
                                            handleLanguageChange(value as CodeLanguage)
                                        }
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {CODE_LANGUAGES.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Code</FormLabel>
                                    <FormControl>
                                        <CodeEditor
                                            value={field.value}
                                            language={language}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Read earlier nodes from {"input"}, and return a value.
                                        No network or file access.
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
                                        <Input {...field} placeholder="myCode" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        Returns to {`{{${watchVariableName}.result}}`}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="timeoutMs"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Timeout (ms, optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value ?? ""} placeholder="5000" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        Defaults to 5000, capped at 30000
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

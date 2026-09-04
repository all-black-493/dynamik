"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { createId } from "@paralleldrive/cuid2"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useEffect } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { ConditionBuilder, conditionSchema, emptyCondition } from "../shared/condition-builder"

const ruleSchema = z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    combinator: z.enum(["AND", "OR"]),
    conditions: z.array(conditionSchema).min(1, "Add at least one condition")
})

const formSchema = z.object({
    variableName: z.string().regex(/^$|^[A-Za-z_$][A-Za-z0-9_$]*$/, {
        error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
    }).optional(),
    rules: z.array(ruleSchema).min(1, "Add at least one rule"),
    matchAll: z.boolean(),
    useFallback: z.boolean()
})

export type SwitchFormValues = z.infer<typeof formSchema>

const emptyRule = () => ({
    id: createId(),
    name: "",
    combinator: "AND" as const,
    conditions: [emptyCondition()]
})

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: SwitchFormValues) => void
    defaultValues?: Partial<SwitchFormValues>;
}

export const SwitchDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {

    const defaults = (): SwitchFormValues => ({
        variableName: defaultValues.variableName || "",
        rules: defaultValues.rules?.length ? defaultValues.rules : [emptyRule()],
        matchAll: defaultValues.matchAll ?? false,
        useFallback: defaultValues.useFallback ?? true
    })

    const form = useForm<SwitchFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: defaults()
    })

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "rules" })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                rules: defaultValues.rules?.length ? defaultValues.rules : [emptyRule()],
                matchAll: defaultValues.matchAll ?? false,
                useFallback: defaultValues.useFallback ?? true
            })
        }
    }, [open, defaultValues, form])

    const handleSubmit = (values: SwitchFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Switch Configuration</DialogTitle>
                    <DialogDescription>
                        One output per rule.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">

                        {fields.map((fieldItem, index) => (
                            <div key={fieldItem.id} className="rounded-lg border-2 p-4 space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <FormField
                                        control={form.control}
                                        name={`rules.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel>Output name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        value={field.value ?? ""}
                                                        placeholder={`rule ${index + 1}`}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {fields.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="mt-6"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash2Icon className="size-4" />
                                        </Button>
                                    )}
                                </div>

                                <ConditionBuilder
                                    form={form}
                                    namePrefix={`rules.${index}.conditions`}
                                    combinatorName={`rules.${index}.combinator`}
                                />
                            </div>
                        ))}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append(emptyRule())}
                        >
                            <PlusIcon className="size-4" />
                            Add rule
                        </Button>

                        <FormField
                            control={form.control}
                            name="matchAll"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-1 pr-6">
                                        <FormLabel>Take every matching rule</FormLabel>
                                        <FormDescription>
                                            Off, the first match wins.
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
                            name="useFallback"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-1 pr-6">
                                        <FormLabel>Add an else output</FormLabel>
                                        <FormDescription>
                                            Where a run goes when nothing matches.
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
                                        <Input {...field} value={field.value ?? ""} placeholder="mySwitch" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        Records which rules matched as {"{{mySwitch.matchedNames}}"}
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

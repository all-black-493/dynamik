"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Form, FormDescription, FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ConditionBuilder, conditionSchema, emptyCondition } from "../shared/condition-builder"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const formSchema = z.object({
    variableName: z.string().regex(/^$|^[A-Za-z_$][A-Za-z0-9_$]*$/, {
        error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
    }).optional(),
    combinator: z.enum(["AND", "OR"]),
    conditions: z.array(conditionSchema).min(1, "Add at least one condition")
})

export type FilterFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: FilterFormValues) => void
    defaultValues?: Partial<FilterFormValues>;
}

export const FilterDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {

    const form = useForm<FilterFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || "",
            combinator: defaultValues.combinator || "AND",
            conditions: defaultValues.conditions?.length ? defaultValues.conditions : [emptyCondition()]
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                combinator: defaultValues.combinator || "AND",
                conditions: defaultValues.conditions?.length ? defaultValues.conditions : [emptyCondition()]
            })
        }
    }, [open, defaultValues, form])

    const handleSubmit = (values: FilterFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Filter Configuration</DialogTitle>
                    <DialogDescription>
                        Carry on only when these conditions hold. Otherwise this path stops here.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
                        <ConditionBuilder form={form} namePrefix="conditions" combinatorName="combinator" />

                        <FormField
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name (optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value ?? ""} placeholder="myFilter" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        Records the outcome as {"{{myFilter.passed}}"}
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

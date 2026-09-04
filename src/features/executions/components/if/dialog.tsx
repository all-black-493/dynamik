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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
    type ConditionType,
    OPERATOR_LABELS,
    OPERATORS_BY_TYPE,
    UNARY_OPERATORS
} from "@/features/executions/lib/conditions"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useEffect } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"

const conditionSchema = z.object({
    left: z.string().min(1, "Left value is required"),
    operator: z.string().min(1, "Operator is required"),
    right: z.string().optional(),
    type: z.enum(["string", "number", "boolean"]),
    caseSensitive: z.boolean().optional()
})

const formSchema = z.object({
    variableName: z
        .string()
        .regex(/^$|^[A-Za-z_$][A-Za-z0-9_$]*$/, {
            error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
        })
        .optional(),
    combinator: z.enum(["AND", "OR"]),
    conditions: z.array(conditionSchema).min(1, "Add at least one condition")
}).superRefine((values, ctx) => {
    values.conditions.forEach((condition, index) => {
        if (UNARY_OPERATORS.has(condition.operator)) return

        if (!condition.right?.trim()) {
            ctx.addIssue({
                code: "custom",
                path: ["conditions", index, "right"],
                message: "Right value is required for this operator"
            })
        }
    })
})

export type IfFormValues = z.infer<typeof formSchema>

const emptyCondition = {
    left: "",
    operator: "equals",
    right: "",
    type: "string" as ConditionType,
    caseSensitive: true
}

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: IfFormValues) => void
    defaultValues?: Partial<IfFormValues>;
}

export const IfDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {}
}: Props) => {

    const form = useForm<IfFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || "",
            combinator: defaultValues.combinator || "AND",
            conditions: defaultValues.conditions?.length
                ? defaultValues.conditions
                : [emptyCondition]
        }
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "conditions"
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                combinator: defaultValues.combinator || "AND",
                conditions: defaultValues.conditions?.length
                    ? defaultValues.conditions
                    : [emptyCondition]
            })
        }
    }, [open, defaultValues, form])

    const conditions = form.watch("conditions")
    const combinator = form.watch("combinator")

    const handleSubmit = (values: IfFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>If Configuration</DialogTitle>
                    <DialogDescription>
                        Send the run down the true or false branch
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">

                        <FormField
                            control={form.control}
                            name="combinator"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Match</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="AND">All conditions</SelectItem>
                                            <SelectItem value="OR">Any condition</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4">
                            {fields.map((fieldItem, index) => {
                                const type = conditions?.[index]?.type ?? "string"
                                const operator = conditions?.[index]?.operator ?? "equals"
                                const isUnary = UNARY_OPERATORS.has(operator)
                                const isString = type === "string"

                                return (
                                    <div
                                        key={fieldItem.id}
                                        className="rounded-lg border p-4 space-y-4"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-xs font-medium">
                                                {index === 0 ? "When" : combinator === "OR" ? "Or" : "And"}
                                            </span>
                                            {fields.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => remove(index)}
                                                >
                                                    <Trash2Icon className="size-4" />
                                                </Button>
                                            )}
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name={`conditions.${index}.left`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Value</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="{{myTrigger.amount}}"
                                                            className="font-mono"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name={`conditions.${index}.type`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Type</FormLabel>
                                                        <Select
                                                            onValueChange={(value) => {
                                                                field.onChange(value)
                                                                // The operator list is per type, so reset to
                                                                // the first valid one instead of leaving an
                                                                // operator the new type rejects.
                                                                form.setValue(
                                                                    `conditions.${index}.operator`,
                                                                    OPERATORS_BY_TYPE[value as ConditionType][0]
                                                                )
                                                            }}
                                                            value={field.value}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="string">Text</SelectItem>
                                                                <SelectItem value="number">Number</SelectItem>
                                                                <SelectItem value="boolean">Boolean</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name={`conditions.${index}.operator`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Operator</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {OPERATORS_BY_TYPE[type as ConditionType].map((op) => (
                                                                    <SelectItem key={op} value={op}>
                                                                        {OPERATOR_LABELS[op] ?? op}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {!isUnary && (
                                            <FormField
                                                control={form.control}
                                                name={`conditions.${index}.right`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Compare to</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                value={field.value ?? ""}
                                                                placeholder={type === "number" ? "1000" : "closed won"}
                                                                className="font-mono"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}

                                        {isString && !isUnary && (
                                            <FormField
                                                control={form.control}
                                                name={`conditions.${index}.caseSensitive`}
                                                render={({ field }) => (
                                                    <FormItem className="flex items-center justify-between">
                                                        <FormLabel className="font-normal">
                                                            Case sensitive
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value ?? true}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                )
                            })}

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append(emptyCondition)}
                            >
                                <PlusIcon className="size-4" />
                                Add condition
                            </Button>
                        </div>

                        <FormField
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name (optional)</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            value={field.value ?? ""}
                                            placeholder="myCheck"
                                            className="font-mono"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Records the outcome as {"{{myCheck.matched}}"} for later nodes
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

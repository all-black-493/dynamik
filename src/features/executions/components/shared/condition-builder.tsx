"use client"

import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
    type ConditionType,
    OPERATOR_LABELS,
    OPERATORS_BY_TYPE,
    UNARY_OPERATORS
} from "@/features/executions/lib/conditions"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useFieldArray } from "react-hook-form"
import { z } from "zod"

/**
 * The builder is embedded in three forms with different shapes (If, Filter, and
 * one per Switch rule), so it addresses fields by resolved path rather than
 * against a single schema.
 */
// biome-ignore lint/suspicious/noExplicitAny: see above
type AnyForm = any

export const conditionSchema = z.object({
    left: z.string().min(1, "Value is required"),
    operator: z.string().min(1, "Operator is required"),
    right: z.string().optional(),
    type: z.enum(["string", "number", "boolean"]),
    caseSensitive: z.boolean().optional()
})

export const emptyCondition = () => ({
    left: "",
    operator: "equals",
    right: "",
    type: "string" as ConditionType,
    caseSensitive: true
})

/**
 * The condition rows shared by If, Filter and each rule of a Switch.
 *
 * Written once because the fiddly parts are easy to get subtly different:
 * resetting the operator when the type changes, hiding the right-hand input for
 * unary operators, and only offering case sensitivity where it means something.
 */
export const ConditionBuilder = ({
    form,
    namePrefix,
    combinatorName
}: {
    form: AnyForm
    /** Path to the condition array, for example "conditions" or "rules.0.conditions". */
    namePrefix: string
    /** Path to the AND/OR field, when the caller shows one. */
    combinatorName?: string
}) => {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: namePrefix
    })

    const conditions = form.watch(namePrefix) ?? []
    const combinator = combinatorName ? form.watch(combinatorName) : "AND"

    return (
        <div className="space-y-4">
            {combinatorName && (
                <FormField
                    control={form.control}
                    name={combinatorName}
                    render={({ field }: { field: AnyForm }) => (
                        <FormItem>
                            <FormLabel>Match</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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
            )}

            {fields.map((fieldItem, index) => {
                const type: ConditionType = conditions?.[index]?.type ?? "string"
                const operator: string = conditions?.[index]?.operator ?? "equals"
                const isUnary = UNARY_OPERATORS.has(operator)

                return (
                    <div key={fieldItem.id} className="rounded-lg border p-4 space-y-4">
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
                            name={`${namePrefix}.${index}.left`}
                            render={({ field }: { field: AnyForm }) => (
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
                                name={`${namePrefix}.${index}.type`}
                                render={({ field }: { field: AnyForm }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select
                                            onValueChange={(value) => {
                                                field.onChange(value)
                                                // Operators are per type, so move to a valid
                                                // one rather than leaving one the new type
                                                // rejects at run time.
                                                form.setValue(
                                                    `${namePrefix}.${index}.operator`,
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
                                name={`${namePrefix}.${index}.operator`}
                                render={({ field }: { field: AnyForm }) => (
                                    <FormItem>
                                        <FormLabel>Operator</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {OPERATORS_BY_TYPE[type].map((op) => (
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
                                name={`${namePrefix}.${index}.right`}
                                render={({ field }: { field: AnyForm }) => (
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

                        {type === "string" && !isUnary && (
                            <FormField
                                control={form.control}
                                name={`${namePrefix}.${index}.caseSensitive`}
                                render={({ field }: { field: AnyForm }) => (
                                    <FormItem className="flex items-center justify-between">
                                        <FormLabel className="font-normal">Case sensitive</FormLabel>
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
                onClick={() => append(emptyCondition())}
            >
                <PlusIcon className="size-4" />
                Add condition
            </Button>
        </div>
    )
}

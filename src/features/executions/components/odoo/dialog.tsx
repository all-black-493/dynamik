"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const OPERATIONS = [
    { value: "SEARCH_READ", label: "Search", hint: "Find records and read their fields." },
    { value: "COUNT", label: "Count", hint: "How many records match." },
    { value: "CREATE", label: "Create", hint: "Add one record." },
    { value: "WRITE", label: "Update", hint: "Change fields on records you have IDs for." },
    { value: "UNLINK", label: "Delete", hint: "Remove records by ID." },
    { value: "CALL", label: "Call method", hint: "Any method on any model, including your own." }
] as const

const formSchema = z.object({
    variableName: z.string().min(1, { error: "Variable name is required" })
        .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
            error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
        }),
    credentialId: z.string().min(1, "Credential is required"),
    operation: z.enum(["SEARCH_READ", "COUNT", "CREATE", "WRITE", "UNLINK", "CALL"]),
    model: z.string().min(1, "Model is required"),
    domain: z.string().optional(),
    fields: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
    order: z.string().optional(),
    values: z.string().optional(),
    ids: z.string().optional(),
    method: z.string().optional(),
    args: z.string().optional(),
    kwargs: z.string().optional()
}).superRefine((values, ctx) => {
    const require = (key: keyof typeof values, message: string) => {
        if (!values[key]?.toString().trim()) {
            ctx.addIssue({ code: "custom", path: [key], message })
        }
    }
    if (["CREATE", "WRITE"].includes(values.operation)) require("values", "Values are required")
    if (["WRITE", "UNLINK"].includes(values.operation)) require("ids", "IDs are required")
    if (values.operation === "CALL") require("method", "Method is required")
})

export type OdooFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: OdooFormValues) => void
    defaultValues?: Partial<OdooFormValues>;
}

const blank = (d: Partial<OdooFormValues>): OdooFormValues => ({
    variableName: d.variableName || "",
    credentialId: d.credentialId || "",
    operation: d.operation || "SEARCH_READ",
    model: d.model || "res.partner",
    domain: d.domain || "",
    fields: d.fields || "",
    limit: d.limit || "",
    offset: d.offset || "",
    order: d.order || "",
    values: d.values || "",
    ids: d.ids || "",
    method: d.method || "",
    args: d.args || "",
    kwargs: d.kwargs || ""
})

export const OdooDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {

    const { data: credentials, isLoading: isLoadingCredentials } =
        useCredentialsByType(CredentialType.ODOO)

    const form = useForm<OdooFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: blank(defaultValues)
    })

    useEffect(() => {
        if (open) {
            form.reset(blank(defaultValues))
        }
    }, [open, defaultValues, form])

    const watchVariableName = form.watch("variableName") || "myOdoo"
    const operation = form.watch("operation")

    const isSearch = operation === "SEARCH_READ"
    const usesDomain = ["SEARCH_READ", "COUNT"].includes(operation)
    const usesValues = ["CREATE", "WRITE"].includes(operation)
    const usesIds = ["WRITE", "UNLINK"].includes(operation)

    const handleSubmit = (values: OdooFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Odoo Configuration</DialogTitle>
                    <DialogDescription>
                        Read or write any Odoo model
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
                        <FormField
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="myOdoo" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        Records arrive at {`{{${watchVariableName}.records}}`}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="credentialId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Odoo Credential</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        disabled={isLoadingCredentials || !credentials?.length}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a credential" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {credentials?.map((credential) => (
                                                <SelectItem key={credential.id} value={credential.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Image src="/logos/odoo.svg" alt="" width={16} height={16} />
                                                        {credential.name}
                                                    </div>
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
                            name="operation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Operation</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {OPERATIONS.map((op) => (
                                                <SelectItem key={op.value} value={op.value}>
                                                    {op.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {OPERATIONS.find((op) => op.value === operation)?.hint}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="model"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Model</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="res.partner" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        res.partner, sale.order, crm.lead, or your own
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {usesDomain && (
                            <FormField
                                control={form.control}
                                name="domain"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Domain (optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                value={field.value ?? ""}
                                                className="min-h-[70px] font-mono text-sm"
                                                placeholder='[["is_company", "=", true], ["name", "ilike", "acme"]]'
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            An Odoo domain. Blank matches everything.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {isSearch && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="fields"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fields (optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    placeholder='["name", "email"]'
                                                    className="font-mono"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Blank returns every field, which is usually far more than needed
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="limit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Limit</FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value ?? ""} placeholder="100" className="font-mono" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="offset"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Offset</FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value ?? ""} placeholder="0" className="font-mono" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="order"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Order</FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value ?? ""} placeholder="create_date desc" className="font-mono" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </>
                        )}

                        {usesIds && (
                            <FormField
                                control={form.control}
                                name="ids"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>IDs</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                value={field.value ?? ""}
                                                placeholder="[12, 13]"
                                                className="font-mono"
                                            />
                                        </FormControl>
                                        <FormDescription>A JSON array of record IDs</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {usesValues && (
                            <FormField
                                control={form.control}
                                name="values"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Values (JSON)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                value={field.value ?? ""}
                                                className="min-h-[90px] font-mono text-sm"
                                                placeholder={'{\n  "name": "{{myTrigger.company}}",\n  "email": "{{myTrigger.email}}"\n}'}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {operation === "CALL" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="method"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Method</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value ?? ""} placeholder="action_confirm" className="font-mono" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="args"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Arguments (JSON array)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    className="min-h-[70px] font-mono text-sm"
                                                    placeholder="[[12]]"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="kwargs"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Keyword arguments (JSON, optional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    className="min-h-[60px] font-mono text-sm"
                                                    placeholder='{ "context": { "lang": "en_US" } }'
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        <DialogFooter className="mt-6">
                            <Button type="submit">Save Configuration</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

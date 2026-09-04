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
import { Textarea } from "@/components/ui/textarea"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const OPERATIONS = [
    { value: "QUERY", label: "Query (SOQL)", hint: "Read records with a SOQL statement." },
    { value: "CREATE", label: "Create record", hint: "Insert one record on any standard or custom object." },
    { value: "UPDATE", label: "Update record", hint: "Patch fields on a record you already have the ID for." },
    { value: "UPSERT", label: "Upsert by external ID", hint: "Create or update, matched on an external ID field. Safe to re-run." },
    { value: "DELETE", label: "Delete record", hint: "Remove a record by ID." },
    { value: "RAW", label: "Raw API call", hint: "Any method and path, including Apex REST. The escape hatch when nothing above fits." }
] as const

const formSchema = z.object({
    variableName: z
        .string()
        .min(1, { error: "Variable name is required" })
        .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
            error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
        }),
    credentialId: z.string().min(1, "Credential is required"),
    operation: z.enum(["QUERY", "CREATE", "UPDATE", "UPSERT", "DELETE", "RAW"]),
    apiVersion: z.string().optional(),
    soql: z.string().optional(),
    sobject: z.string().optional(),
    recordId: z.string().optional(),
    externalIdField: z.string().optional(),
    externalIdValue: z.string().optional(),
    fields: z.string().optional(),
    method: z.string().optional(),
    path: z.string().optional(),
    body: z.string().optional()
}).superRefine((values, ctx) => {
    const requireField = (key: keyof typeof values, message: string) => {
        if (!values[key]?.toString().trim()) {
            ctx.addIssue({ code: "custom", path: [key], message })
        }
    }

    if (values.operation === "QUERY") requireField("soql", "SOQL query is required")

    if (["CREATE", "UPDATE", "UPSERT", "DELETE"].includes(values.operation)) {
        requireField("sobject", "Object is required")
    }

    if (["UPDATE", "DELETE"].includes(values.operation)) {
        requireField("recordId", "Record ID is required")
    }

    if (values.operation === "UPSERT") {
        requireField("externalIdField", "External ID field is required")
        requireField("externalIdValue", "External ID value is required")
    }

    if (["CREATE", "UPDATE", "UPSERT"].includes(values.operation)) {
        requireField("fields", "Fields JSON is required")
    }

    if (values.operation === "RAW") requireField("path", "Path is required")
})

export type SalesforceFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: SalesforceFormValues) => void
    defaultValues?: Partial<SalesforceFormValues>;
}

export const SalesforceDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {}
}: Props) => {

    const {
        data: credentials,
        isLoading: isLoadingCredentials
    } = useCredentialsByType(CredentialType.SALESFORCE)

    const form = useForm<SalesforceFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || "",
            credentialId: defaultValues.credentialId || "",
            operation: defaultValues.operation || "QUERY",
            apiVersion: defaultValues.apiVersion || "",
            soql: defaultValues.soql || "",
            sobject: defaultValues.sobject || "",
            recordId: defaultValues.recordId || "",
            externalIdField: defaultValues.externalIdField || "",
            externalIdValue: defaultValues.externalIdValue || "",
            fields: defaultValues.fields || "",
            method: defaultValues.method || "GET",
            path: defaultValues.path || "",
            body: defaultValues.body || ""
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                credentialId: defaultValues.credentialId || "",
                operation: defaultValues.operation || "QUERY",
                apiVersion: defaultValues.apiVersion || "",
                soql: defaultValues.soql || "",
                sobject: defaultValues.sobject || "",
                recordId: defaultValues.recordId || "",
                externalIdField: defaultValues.externalIdField || "",
                externalIdValue: defaultValues.externalIdValue || "",
                fields: defaultValues.fields || "",
                method: defaultValues.method || "GET",
                path: defaultValues.path || "",
                body: defaultValues.body || ""
            })
        }
    }, [open, defaultValues, form])

    const watchVariableName = form.watch("variableName") || "mySalesforce"
    const operation = form.watch("operation")

    const needsObject = ["CREATE", "UPDATE", "UPSERT", "DELETE"].includes(operation)
    const needsRecordId = ["UPDATE", "DELETE"].includes(operation)
    const needsFields = ["CREATE", "UPDATE", "UPSERT"].includes(operation)

    const handleSubmit = (values: SalesforceFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Salesforce Configuration</DialogTitle>
                    <DialogDescription>
                        Read or write any Salesforce object through the REST API
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-6 mt-4"
                    >
                        <FormField
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="mySalesforce" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        Reference this node: {`{{${watchVariableName}.result}}`}
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
                                    <FormLabel>Salesforce Credential</FormLabel>
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
                                                        <Image
                                                            src="/logos/salesforce.svg"
                                                            alt="Salesforce"
                                                            width={16}
                                                            height={16}
                                                        />
                                                        {credential.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        A connected app with the client credentials flow enabled
                                    </FormDescription>
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                        {operation === "QUERY" && (
                            <FormField
                                control={form.control}
                                name="soql"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SOQL Query</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                className="min-h-[80px] font-mono text-sm"
                                                placeholder="SELECT Id, Name FROM Account WHERE CreatedDate = TODAY"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Supports {"{{variables}}"}, so an upstream node can supply the filter.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {needsObject && (
                            <FormField
                                control={form.control}
                                name="sobject"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Object</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Account" className="font-mono" />
                                        </FormControl>
                                        <FormDescription>
                                            Any standard or custom object, for example Contact or Invoice__c
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {needsRecordId && (
                            <FormField
                                control={form.control}
                                name="recordId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Record ID</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="{{myQuery.result.records.0.Id}}"
                                                className="font-mono"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {operation === "UPSERT" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="externalIdField"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>External ID Field</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="ExtId__c" className="font-mono" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="externalIdValue"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>External ID Value</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="{{myTrigger.customerRef}}"
                                                    className="font-mono"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        {needsFields && (
                            <FormField
                                control={form.control}
                                name="fields"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fields (JSON)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                className="min-h-[100px] font-mono text-sm"
                                                placeholder={'{\n  "Name": "{{myTrigger.company}}",\n  "Phone": "{{myTrigger.phone}}"\n}'}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Templated before it is parsed, so {"{{json upstream}}"} can supply the whole object.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {operation === "RAW" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="method"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Method</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                    name="path"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Path</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="sobjects/Account/describe"
                                                    className="font-mono"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Relative to the API version, or start with / to address the
                                                instance directly, such as /services/apexrest/MyEndpoint
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="body"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Body (JSON, optional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    className="min-h-[80px] font-mono text-sm"
                                                    placeholder='{ "records": [] }'
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        <FormField
                            control={form.control}
                            name="apiVersion"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>API Version (optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="v62.0" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        Defaults to v62.0. Pin it if your org relies on older behaviour.
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

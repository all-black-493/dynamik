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
    { value: "SEARCH", label: "Search", hint: "Filter records with the full search API: filter groups, sorts and paging." },
    { value: "LIST", label: "List", hint: "Page through every record of a type." },
    { value: "GET", label: "Get by ID", hint: "Read one record." },
    { value: "CREATE", label: "Create", hint: "Insert a record on any object type, standard or custom." },
    { value: "UPDATE", label: "Update", hint: "Patch properties on an existing record." },
    { value: "DELETE", label: "Delete", hint: "Archive a record." },
    { value: "ASSOCIATE", label: "Associate", hint: "Link two records, such as a contact to a company." },
    { value: "RAW", label: "Raw API call", hint: "Any method and path across the whole HubSpot API, not just the CRM." }
] as const

const OBJECT_SUGGESTIONS = "contacts, companies, deals, tickets, or a custom object type"

const formSchema = z.object({
    variableName: z
        .string()
        .min(1, { error: "Variable name is required" })
        .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
            error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
        }),
    credentialId: z.string().min(1, "Credential is required"),
    operation: z.enum(["SEARCH", "LIST", "GET", "CREATE", "UPDATE", "DELETE", "ASSOCIATE", "RAW"]),
    objectType: z.string().optional(),
    recordId: z.string().optional(),
    properties: z.string().optional(),
    searchBody: z.string().optional(),
    limit: z.string().optional(),
    after: z.string().optional(),
    propertyList: z.string().optional(),
    toObjectType: z.string().optional(),
    toRecordId: z.string().optional(),
    associationType: z.string().optional(),
    method: z.string().optional(),
    path: z.string().optional(),
    body: z.string().optional()
}).superRefine((values, ctx) => {
    const requireField = (key: keyof typeof values, message: string) => {
        if (!values[key]?.toString().trim()) {
            ctx.addIssue({ code: "custom", path: [key], message })
        }
    }

    if (values.operation !== "RAW") requireField("objectType", "Object type is required")

    if (["GET", "UPDATE", "DELETE", "ASSOCIATE"].includes(values.operation)) {
        requireField("recordId", "Record ID is required")
    }

    if (["CREATE", "UPDATE"].includes(values.operation)) {
        requireField("properties", "Properties JSON is required")
    }

    if (values.operation === "ASSOCIATE") {
        requireField("toObjectType", "Target object type is required")
        requireField("toRecordId", "Target record ID is required")
    }

    if (values.operation === "RAW") requireField("path", "Path is required")
})

export type HubspotFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: HubspotFormValues) => void
    defaultValues?: Partial<HubspotFormValues>;
}

const emptyValues = (defaults: Partial<HubspotFormValues>): HubspotFormValues => ({
    variableName: defaults.variableName || "",
    credentialId: defaults.credentialId || "",
    operation: defaults.operation || "SEARCH",
    objectType: defaults.objectType || "contacts",
    recordId: defaults.recordId || "",
    properties: defaults.properties || "",
    searchBody: defaults.searchBody || "",
    limit: defaults.limit || "",
    after: defaults.after || "",
    propertyList: defaults.propertyList || "",
    toObjectType: defaults.toObjectType || "",
    toRecordId: defaults.toRecordId || "",
    associationType: defaults.associationType || "",
    method: defaults.method || "GET",
    path: defaults.path || "",
    body: defaults.body || ""
})

export const HubspotDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {}
}: Props) => {

    const {
        data: credentials,
        isLoading: isLoadingCredentials
    } = useCredentialsByType(CredentialType.HUBSPOT)

    const form = useForm<HubspotFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: emptyValues(defaultValues)
    })

    useEffect(() => {
        if (open) {
            form.reset(emptyValues(defaultValues))
        }
    }, [open, defaultValues, form])

    const watchVariableName = form.watch("variableName") || "myHubspot"
    const operation = form.watch("operation")

    const needsRecordId = ["GET", "UPDATE", "DELETE", "ASSOCIATE"].includes(operation)
    const needsProperties = ["CREATE", "UPDATE"].includes(operation)
    const showPropertyList = ["LIST", "GET"].includes(operation)

    const handleSubmit = (values: HubspotFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Hubspot Configuration</DialogTitle>
                    <DialogDescription>
                        Read or write any Hubspot object through the CRM API
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
                                        <Input {...field} placeholder="myHubspot" className="font-mono" />
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
                                    <FormLabel>Hubspot Credential</FormLabel>
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
                                                            src="/logos/hubspot.svg"
                                                            alt="Hubspot"
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
                                        A private app access token, with the scopes for the objects you touch
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

                        {operation !== "RAW" && (
                            <FormField
                                control={form.control}
                                name="objectType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Object Type</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="contacts" className="font-mono" />
                                        </FormControl>
                                        <FormDescription>{OBJECT_SUGGESTIONS}</FormDescription>
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
                                                placeholder="{{mySearch.result.results.0.id}}"
                                                className="font-mono"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {operation === "SEARCH" && (
                            <FormField
                                control={form.control}
                                name="searchBody"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Search Body (JSON)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                className="min-h-[140px] font-mono text-sm"
                                                placeholder={'{\n  "filterGroups": [{\n    "filters": [{\n      "propertyName": "email",\n      "operator": "EQ",\n      "value": "{{myTrigger.email}}"\n    }]\n  }],\n  "properties": ["email", "firstname"],\n  "limit": 100\n}'}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            The full search request. Blank matches everything.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {operation === "LIST" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="limit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Limit (optional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="100" className="font-mono" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="after"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>After (optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="{{myPrevious.result.paging.next.after}}"
                                                    className="font-mono"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Paging cursor from a previous run of this node
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        {showPropertyList && (
                            <FormField
                                control={form.control}
                                name="propertyList"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Properties (optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="email,firstname,lastname"
                                                className="font-mono"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Comma separated. Hubspot returns only a default set otherwise.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {needsProperties && (
                            <FormField
                                control={form.control}
                                name="properties"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Properties (JSON)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                className="min-h-[100px] font-mono text-sm"
                                                placeholder={'{\n  "email": "{{myTrigger.email}}",\n  "firstname": "{{myTrigger.name}}"\n}'}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Templated before parsing, so {"{{json upstream}}"} can supply the whole object.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {operation === "ASSOCIATE" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="toObjectType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Target Object Type</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="companies" className="font-mono" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="toRecordId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Target Record ID</FormLabel>
                                            <FormControl>
                                                <Input {...field} className="font-mono" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="associationType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Association Type ID (optional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="279" className="font-mono" />
                                            </FormControl>
                                            <FormDescription>
                                                Leave blank to use Hubspot's default association for the pair
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
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
                                                    placeholder="/marketing/v3/emails"
                                                    className="font-mono"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Relative to api.hubapi.com, not just the CRM
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
                                                    placeholder='{ "properties": {} }'
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

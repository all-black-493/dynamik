"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const OPERATIONS = [
    { value: "QUERY", label: "Query", hint: "Returns rows. Feed them straight into a Loop." },
    { value: "EXECUTE", label: "Execute", hint: "Insert, update or delete. Returns the row count." },
    { value: "TRANSACTION", label: "Transaction", hint: "Several statements, all or nothing." }
] as const

const formSchema = z.object({
    variableName: z.string().min(1, { error: "Variable name is required" })
        .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
            error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
        }),
    credentialId: z.string().min(1, "Credential is required"),
    operation: z.enum(["QUERY", "EXECUTE", "TRANSACTION"]),
    sql: z.string().optional(),
    statements: z.string().optional(),
    parameters: z.string().optional(),
    templateSql: z.boolean(),
    rowLimit: z.string().optional()
}).superRefine((values, ctx) => {
    const key = values.operation === "TRANSACTION" ? "statements" : "sql"
    if (!values[key]?.trim()) {
        ctx.addIssue({ code: "custom", path: [key], message: "SQL is required" })
    }
})

export type PostgresFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: PostgresFormValues) => void
    defaultValues?: Partial<PostgresFormValues>;
}

export const PostgresDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {

    const { data: credentials, isLoading: isLoadingCredentials } =
        useCredentialsByType(CredentialType.POSTGRES)

    const form = useForm<PostgresFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || "",
            credentialId: defaultValues.credentialId || "",
            operation: defaultValues.operation || "QUERY",
            sql: defaultValues.sql || "",
            statements: defaultValues.statements || "",
            parameters: defaultValues.parameters || "",
            templateSql: defaultValues.templateSql ?? false,
            rowLimit: defaultValues.rowLimit || ""
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                credentialId: defaultValues.credentialId || "",
                operation: defaultValues.operation || "QUERY",
                sql: defaultValues.sql || "",
                statements: defaultValues.statements || "",
                parameters: defaultValues.parameters || "",
                templateSql: defaultValues.templateSql ?? false,
                rowLimit: defaultValues.rowLimit || ""
            })
        }
    }, [open, defaultValues, form])

    const watchVariableName = form.watch("variableName") || "myQuery"
    const operation = form.watch("operation")
    const isTransaction = operation === "TRANSACTION"

    const handleSubmit = (values: PostgresFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Postgres Configuration</DialogTitle>
                    <DialogDescription>
                        Query or update a Postgres database
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
                                        <Input {...field} placeholder="myQuery" className="font-mono" />
                                    </FormControl>
                                    <FormDescription>
                                        Rows arrive at {`{{${watchVariableName}.rows}}`}
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
                                    <FormLabel>Database Credential</FormLabel>
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
                                                    {credential.name}
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
                            name={isTransaction ? "statements" : "sql"}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>SQL</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            value={field.value ?? ""}
                                            className="min-h-[120px] font-mono text-sm"
                                            placeholder={isTransaction
                                                ? "UPDATE accounts SET balance = balance - $1 WHERE id = $2\n;;\nUPDATE accounts SET balance = balance + $1 WHERE id = $3"
                                                : "SELECT id, email FROM customers WHERE created_at > $1"}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {isTransaction
                                            ? "Separate statements with ;; on its own line"
                                            : "Use $1, $2 for values, filled in below"}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="parameters"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Parameters (JSON array)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            value={field.value ?? ""}
                                            className="min-h-[70px] font-mono text-sm"
                                            placeholder='["{{myTrigger.since}}", 42]'
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Bound, not pasted into the SQL. Safe for untrusted values.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {!isTransaction && operation === "QUERY" && (
                            <FormField
                                control={form.control}
                                name="rowLimit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Row Limit (optional)</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ?? ""} placeholder="1000" className="font-mono" />
                                        </FormControl>
                                        <FormDescription>Defaults to 1000</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="templateSql"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-1 pr-6">
                                        <FormLabel>Allow variables in the SQL</FormLabel>
                                        <FormDescription>
                                            Only for table and column names. Values belong in parameters.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
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

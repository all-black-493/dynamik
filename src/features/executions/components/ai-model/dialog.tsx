"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

export const PROVIDERS = [
    { value: "openai", label: "OpenAI", credential: CredentialType.OPENAI, example: "gpt-4o" },
    { value: "anthropic", label: "Anthropic", credential: CredentialType.ANTHROPIC, example: "claude-sonnet-4-5" },
    { value: "google", label: "Gemini", credential: CredentialType.GEMINI, example: "gemini-2.5-pro" },
    { value: "deepseek", label: "DeepSeek", credential: CredentialType.DEEPSEEK, example: "deepseek-chat" },
    { value: "xai", label: "Grok", credential: CredentialType.GROK, example: "grok-4" }
] as const

const formSchema = z.object({
    provider: z.enum(["openai", "anthropic", "google", "deepseek", "xai"]),
    model: z.string().min(1, "Model is required"),
    credentialId: z.string().min(1, "Credential is required"),
    temperature: z.string().optional()
})

export type AiModelFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: AiModelFormValues) => void
    defaultValues?: Partial<AiModelFormValues>;
}

export const AiModelDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {

    const form = useForm<AiModelFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            provider: defaultValues.provider || "openai",
            model: defaultValues.model || "",
            credentialId: defaultValues.credentialId || "",
            temperature: defaultValues.temperature || ""
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                provider: defaultValues.provider || "openai",
                model: defaultValues.model || "",
                credentialId: defaultValues.credentialId || "",
                temperature: defaultValues.temperature || ""
            })
        }
    }, [open, defaultValues, form])

    const provider = form.watch("provider")
    const spec = PROVIDERS.find((p) => p.value === provider) ?? PROVIDERS[0]

    // Credentials are per provider, so switching provider changes the list and
    // any credential already chosen no longer belongs to it.
    const { data: credentials, isLoading } = useCredentialsByType(spec.credential)

    const handleSubmit = (values: AiModelFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Model</DialogTitle>
                    <DialogDescription>
                        Which model the agent thinks with
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
                        <FormField
                            control={form.control}
                            name="provider"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Provider</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value)
                                            form.setValue("credentialId", "")
                                        }}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {PROVIDERS.map((option) => (
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
                            name="credentialId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Credential</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={isLoading || !credentials?.length}
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
                            name="model"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Model</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder={spec.example} className="font-mono" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="temperature"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Temperature (optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value ?? ""} placeholder="0.7" className="font-mono" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="mt-6">
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

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
import { Textarea } from "@/components/ui/textarea"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const formSchema = z.object({
    variableName: z
        .string()
        .min(1, { error: "Variable name is required" })
        .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
            error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
        }),
    credentialId: z.string().min(1, "Credential is required"),
    phoneNumberId: z.string().min(1, "Phone number ID is required"),
    recipient: z.string().min(1, "Recipient is required"),
    content: z
        .string()
        .min(1, "Message content is required")
        .max(4096, "Whatsapp messages cannot exceed 4096 characters"),
    previewUrl: z.boolean()
})

export type WhatsappFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: WhatsappFormValues) => void
    defaultValues?: Partial<WhatsappFormValues>;
}

export const WhatsappDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {}
}: Props) => {

    const {
        data: credentials,
        isLoading: isLoadingCredentials
    } = useCredentialsByType(CredentialType.WHATSAPP_ACCESS_TOKEN)

    const form = useForm<WhatsappFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || "",
            credentialId: defaultValues.credentialId || "",
            phoneNumberId: defaultValues.phoneNumberId || "",
            recipient: defaultValues.recipient || "",
            content: defaultValues.content || "",
            previewUrl: defaultValues.previewUrl ?? false
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                credentialId: defaultValues.credentialId || "",
                phoneNumberId: defaultValues.phoneNumberId || "",
                recipient: defaultValues.recipient || "",
                content: defaultValues.content || "",
                previewUrl: defaultValues.previewUrl ?? false
            })
        }
    }, [open, defaultValues, form])

    const watchVariableName = form.watch("variableName") || "myWhatsapp"

    const handleSubmit = (values: WhatsappFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Whatsapp Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Send a message through the Whatsapp Cloud API
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
                                        <Input
                                            {...field}
                                            placeholder="myWhatsapp"
                                            className="font-mono"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Reference this node: {`{{${watchVariableName}.messageId}}`}
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
                                    <FormLabel>
                                        Whatsapp Credential
                                    </FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        disabled={
                                            isLoadingCredentials || !credentials?.length
                                        }
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a credential" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {credentials?.map((credential) => (
                                                <SelectItem
                                                    key={credential.id}
                                                    value={credential.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Image
                                                            src="/logos/whatsapp.svg"
                                                            alt="Whatsapp"
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
                                        A permanent access token from your Meta app, stored as a
                                        Whatsapp Access Token credential
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phoneNumberId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Phone Number ID
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="123456789012345"
                                            className="font-mono"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Meta for Developers: your app → Whatsapp → API Setup
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="recipient"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Recipient
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="+254712345678"
                                            className="font-mono"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Phone number in international format. Supports {"{{variables}}"}.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Message Content</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            className="min-h-[80px] font-mono text-sm"
                                            placeholder="Summary: {{myGemini.text}}"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Use {"{{variables}}"} for dynamic values or {"{{json variable}}"} to stringify objects.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="previewUrl"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Link Preview</FormLabel>
                                        <FormDescription>
                                            Render a preview card for the first link in the message
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
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

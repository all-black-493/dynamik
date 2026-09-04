"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CredentialType } from "@/generated/prisma"
import { useUpgradeModal } from "@/hooks/use-upgrade-modal"
import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import z from "zod"
import { useCreateCredential, useSuspenseCredential, useUpdateCredential } from "../hooks/use-credentials"

// The stored key is never sent to the browser, so an edit leaves the field
// blank and only submits a value when the user is actually rotating the key.
const buildFormSchema = (isEdit: boolean) => z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(CredentialType),
    value: isEdit
        ? z.string().optional()
        : z.string().min(1, "API key is required")
})

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>

const credentialTypeOptions = [
    {
        value: CredentialType.OPENAI,
        label: "OpenAI",
        logo: "/logos/openai.svg"
    },
    {
        value: CredentialType.ANTHROPIC,
        label: "Anthropic",
        logo: "/logos/anthropic.svg"
    },
    {
        value: CredentialType.GEMINI,
        label: "Gemini",
        logo: "/logos/gemini.svg"
    },
    {
        value: CredentialType.GROK,
        label: "Grok",
        logo: "/logos/grok.svg"
    },
    {
        value: CredentialType.DEEPSEEK,
        label: "Deepseek",
        logo: "/logos/deepseek.svg"
    },
    {
        value: CredentialType.PERPLEXITY,
        label: "Perplexity",
        logo: "/logos/perplexity.svg"
    },
    {
        value: CredentialType.TIKTOK_CLIENT_KEY,
        label: "Tiktok Client Key",
        logo: "/logos/tiktok.svg"
    },
    {
        value: CredentialType.TIKTOK_CLIENT_SECRET,
        label: "Tiktok Client Secret",
        logo: "/logos/tiktok.svg"
    },
]

interface CredentialFormProps {
    initialData?: {
        id?: string
        name: string
        type: CredentialType
    }
}

export const CredentialForm = ({ initialData }: CredentialFormProps) => {
    const router = useRouter()

    const createCredential = useCreateCredential()
    const updateCredential = useUpdateCredential()
    const { handleError, modal } = useUpgradeModal()

    const isEdit = !!initialData?.id

    const form = useForm<FormValues>({
        resolver: zodResolver(buildFormSchema(isEdit)),
        defaultValues: {
            name: initialData?.name ?? "",
            type: initialData?.type ?? CredentialType.OPENAI,
            value: ""
        }
    })

    const onSubmit = async (values: FormValues) => {
        if (isEdit && initialData?.id) {
            await updateCredential.mutateAsync({
                id: initialData.id,
                ...values
            })
        } else {
            // The create schema guarantees a value; the optional type comes from
            // the shared edit schema.
            await createCredential.mutateAsync({ ...values, value: values.value ?? "" }, {
                onSuccess: (data) => {
                    router.push(`/credentials/${data.id}`)
                },

                onError: (error) => {
                    handleError(error)
                }
            })
        }
    }

    return (
        <>
            {modal}
            <Card className="shadow-none">
                <CardHeader>
                    <CardTitle>
                        {isEdit ? "Edit Credential" : "Create Credential"}
                    </CardTitle>
                    <CardDescription>
                        {isEdit
                            ? "Update your API Key or credential details"
                            : "Add a new API Key or credential to your account"
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-6"
                        >
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Name
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="My API Key" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (

                                    <FormItem>
                                        <FormLabel>
                                            Type
                                        </FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {credentialTypeOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        <div className="flex items-center gap-2">
                                                            <Image
                                                                src={option.logo}
                                                                alt={option.label}
                                                                width={16}
                                                                height={16}
                                                            />
                                                            {option.label}
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
                                name="value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {isEdit ? "API Key (leave blank to keep current)" : "API Key"}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                autoComplete="off"
                                                placeholder={isEdit ? "Unchanged" : "sk-..."}
                                                {...field}
                                                value={field.value ?? ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex gap-4">
                                <Button
                                    type="submit"
                                    disabled={
                                        createCredential.isPending || updateCredential.isPending
                                    }
                                >
                                    {isEdit ? "Update" : "Create"}

                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    asChild
                                >
                                    <Link
                                        href="/credentials"
                                        prefetch
                                    >
                                        Cancel
                                    </Link>
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </>
    )
}


const CredentialView = ({
    credentialId,
}: { credentialId: string }) => {
    const { data: credential } = useSuspenseCredential(credentialId)

    return (
        <CredentialForm initialData={credential} />
    )
}

export default CredentialView

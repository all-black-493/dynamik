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
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import useSWR from "swr";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import Image from "next/image"

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formSchema = z.object({
    variableName: z
        .string()
        .min(1, { error: "Variable name is required" })
        .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
            error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
        }),
    model: z.string().min(1, "Model is required"),
    credentialId: z.string().min(1, "Credential is required"),
    systemPrompt: z.string().optional(),
    userPrompt: z.string().min(1, "User prompt is required"),
    mcpServerUrl: z
        .url({ error: "Please enter a valid URL (e.g., https://mcp.sanity.io)" })
        .optional()
        .or(z.literal("")),
    mcpAuthToken: z.string().optional(),
    enabledTools: z.array(z.string())
})

export type DeepseekFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: DeepseekFormValues) => void
    defaultValues?: Partial<DeepseekFormValues>;
}

export const DeepseekDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {}
}: Props) => {
    const [availableTools, setAvailableTools] = useState<{ name: string, description: string }[]>([])
    const [isFetchingTools, setIsFetchingTools] = useState(false)
    const [toolError, setToolError] = useState("")

    const { data: credentials,
        isLoading: isLoadingCredentials
    } = useCredentialsByType(CredentialType.DEEPSEEK)

    const form = useForm<DeepseekFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || "",
            model: defaultValues.model,
            systemPrompt: defaultValues.systemPrompt || "",
            userPrompt: defaultValues.userPrompt || "",
            mcpServerUrl: defaultValues.mcpServerUrl || "",
            mcpAuthToken: defaultValues.mcpAuthToken || "",
            enabledTools: defaultValues.enabledTools || [],
            credentialId: defaultValues.credentialId || "",

        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                model: defaultValues.model,
                credentialId: defaultValues.credentialId || "",
                systemPrompt: defaultValues.systemPrompt || "",
                userPrompt: defaultValues.userPrompt || "",
                mcpServerUrl: defaultValues.mcpServerUrl || "",
                mcpAuthToken: defaultValues.mcpAuthToken || "",
                enabledTools: defaultValues.enabledTools || [],

            })
            // Reset tools state when dialog opens
            setAvailableTools([])
            setToolError("")
        }
    }, [open, defaultValues, form])

    const watchVariableName = form.watch("variableName") || "myDeepseek"
    const currentMcpUrl = form.watch("mcpServerUrl")
    const currentMcpAuth = form.watch("mcpAuthToken")
    const { data, isLoading: isFetchingModels, error } = useSWR(
        open ? "/api/models/deepseek" : null,
        fetcher
    );

    const availableModels = data?.models;

    const handleConnect = async () => {
        if (!currentMcpUrl) return;
        setIsFetchingTools(true);
        setToolError("");

        try {
            const response = await fetch("/api/mcp/discover", {
                method: "POST",
                body: JSON.stringify({
                    url: currentMcpUrl,
                    token: currentMcpAuth
                })
            });
            const data = await response.json();

            setAvailableTools(data.tools);

            if (form.getValues("enabledTools").length === 0) {
                form.setValue("enabledTools", data.tools.map((t: any) => t.name));
            }
        } catch (err) {
            setToolError("Failed to fetch tools. Check URL and Auth.");
        } finally {
            setIsFetchingTools(false);
        }
    };


    const handleSubmit = (values: DeepseekFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Added max-h and overflow-y-auto to handle the taller form gracefully */}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Deepseek Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure the AI model, prompts, and the MCP tools available
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
                                            placeholder="myDeepseek"
                                            className="font-mono"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Reference this node: {`{{${watchVariableName}.text}}`}
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
                                        Deepseek Credential
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
                                                            src="/logos/deepseek.svg"
                                                            alt="deepseek"
                                                            width={16}
                                                            height={16}
                                                        />
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
                            name="model"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Model</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a model" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {isFetchingModels ? (
                                                <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                                                    <span className="animate-pulse">Loading DeepSeek models...</span>
                                                </div>
                                            ) : availableModels?.length > 0 ? (
                                                availableModels.map((modelId: string) => (
                                                    <SelectItem key={modelId} value={modelId}>
                                                        {modelId}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <div className="p-4 text-sm text-muted-foreground">
                                                    No models available.
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        The Deepseek model to use
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                            <h3 className="text-sm font-semibold">MCP Settings</h3>
                            <div className="grid gap-4">
                                <FormField
                                    control={form.control}
                                    name="mcpServerUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Server URL</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="https://api.my-mcp-server.com"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="mcpAuthToken"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Authorization Token</FormLabel>
                                            <FormControl>
                                                <Input {...field}
                                                    placeholder="Bearer tk_..."
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleConnect}
                                disabled={isFetchingTools || !currentMcpUrl}
                            >
                                {isFetchingTools ? "Connecting..." : "Connect"}
                            </Button>

                            {toolError && <p className="text-sm text-destructive">{toolError}</p>}

                            {availableTools.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    <FormLabel>Select Enabled Tools</FormLabel>
                                    <div className="grid grid-cols-1 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto bg-background">
                                        {availableTools.map((tool) => (
                                            <div key={tool.name} className="flex items-start space-x-3 space-y-0">
                                                <input
                                                    type="checkbox"
                                                    className="mt-1 h-4 w-4 rounded border-gray-300"
                                                    checked={form.watch("enabledTools").includes(tool.name)}
                                                    onChange={(e) => {
                                                        const current = form.getValues("enabledTools");
                                                        const next = e.target.checked
                                                            ? [...current, tool.name]
                                                            : current.filter(n => n !== tool.name);
                                                        form.setValue("enabledTools", next);
                                                    }}
                                                />
                                                <div className="grid gap-1.5 leading-none">
                                                    <label className="text-sm font-mono font-medium leading-none">
                                                        {tool.name}
                                                    </label>
                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                        {tool.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <FormField
                            control={form.control}
                            name="systemPrompt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>System Prompt (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            className="min-h-[80px] font-mono text-sm"
                                            placeholder="You are a helpful assistant"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Sets the behavior of the assistant. Use {"{{variables}}"} for dynamic values.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="userPrompt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>User Prompt</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            className="min-h-[80px] font-mono text-sm"
                                            placeholder="Summarize this text: {{json httpResponse.data}}"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        The prompt to send to the AI.
                                        Use {"{{variables}}"} for simple values or {"{{json variable}}"} to stringify objects.
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
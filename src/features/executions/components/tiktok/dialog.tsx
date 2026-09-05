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

const POST_MODES = [
    {
        value: "INBOX",
        label: "Save to drafts",
        hint: "Sends the video to the account's TikTok inbox to finish and publish by hand. Needs the video.upload scope."
    },
    {
        value: "DIRECT_POST",
        label: "Publish directly",
        hint: "Publishes straight to the account. Needs the video.publish scope and an audited client."
    }
] as const

const PRIVACY_LEVELS = [
    { value: "PUBLIC_TO_EVERYONE", label: "Public to everyone" },
    { value: "MUTUAL_FOLLOW_FRIENDS", label: "Friends (mutual follows)" },
    { value: "FOLLOWER_OF_CREATOR", label: "Followers" },
    { value: "SELF_ONLY", label: "Private (only me)" }
] as const

const formSchema = z.object({
    variableName: z
        .string()
        .min(1, { error: "Variable name is required" })
        .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
            error: "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
        }),
    credentialId: z.string().min(1, "Credential is required"),
    postMode: z.enum(["INBOX", "DIRECT_POST"]),
    videoUrl: z.string().min(1, "Video URL is required"),
    title: z.string().max(2200, "Titles cannot exceed 2200 characters").optional(),
    privacyLevel: z.enum(["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"]).optional(),
    disableComment: z.boolean(),
    disableDuet: z.boolean(),
    disableStitch: z.boolean()
}).refine(
    (values) => values.postMode !== "DIRECT_POST" || !!values.privacyLevel,
    { error: "Privacy level is required for a direct post", path: ["privacyLevel"] }
)

export type TiktokFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: TiktokFormValues) => void
    defaultValues?: Partial<TiktokFormValues>;
}

export const TiktokDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {}
}: Props) => {

    const {
        data: credentials,
        isLoading: isLoadingCredentials
    } = useCredentialsByType(CredentialType.TIKTOK)

    const form = useForm<TiktokFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || "",
            credentialId: defaultValues.credentialId || "",
            postMode: defaultValues.postMode || "INBOX",
            videoUrl: defaultValues.videoUrl || "",
            title: defaultValues.title || "",
            privacyLevel: defaultValues.privacyLevel,
            disableComment: defaultValues.disableComment ?? false,
            disableDuet: defaultValues.disableDuet ?? false,
            disableStitch: defaultValues.disableStitch ?? false
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                credentialId: defaultValues.credentialId || "",
                postMode: defaultValues.postMode || "INBOX",
                videoUrl: defaultValues.videoUrl || "",
                title: defaultValues.title || "",
                privacyLevel: defaultValues.privacyLevel,
                disableComment: defaultValues.disableComment ?? false,
                disableDuet: defaultValues.disableDuet ?? false,
                disableStitch: defaultValues.disableStitch ?? false
            })
        }
    }, [open, defaultValues, form])

    const watchVariableName = form.watch("variableName") || "myTiktok"
    const watchPostMode = form.watch("postMode")
    const isDirectPost = watchPostMode === "DIRECT_POST"

    const handleSubmit = (values: TiktokFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Tiktok Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Post a video to Tiktok through the Content Posting API
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
                                            placeholder="myTiktok"
                                            className="font-mono"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Reference this node: {`{{${watchVariableName}.publishId}}`}
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
                                        Tiktok Credential
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
                                                            src="/logos/tiktok.svg"
                                                            alt="Tiktok"
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
                                        A user access token. The client key and secret cannot post.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="postMode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Post Mode
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
                                            {POST_MODES.map((mode) => (
                                                <SelectItem key={mode.value} value={mode.value}>
                                                    {mode.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {POST_MODES.find((m) => m.value === watchPostMode)?.hint}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="videoUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Video URL
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="https://cdn.example.com/clip.mp4"
                                            className="font-mono"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        The domain must be verified with Tiktok. Supports {"{{variables}}"}.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isDirectPost && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Caption</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    className="min-h-[80px] font-mono text-sm"
                                                    placeholder="New drop {{myGemini.text}} #fyp"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Hashtags and @mentions are written inline. Supports {"{{variables}}"}.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="privacyLevel"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Privacy Level
                                            </FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select a privacy level" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {PRIVACY_LEVELS.map((level) => (
                                                        <SelectItem key={level.value} value={level.value}>
                                                            {level.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                An unaudited client can only post as private.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="disableComment"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                            <FormLabel>Disable comments</FormLabel>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="disableDuet"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                            <FormLabel>Disable duet</FormLabel>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="disableStitch"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                            <FormLabel>Disable stitch</FormLabel>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
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

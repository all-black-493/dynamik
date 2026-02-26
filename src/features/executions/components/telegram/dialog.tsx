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
import { Textarea } from "@/components/ui/textarea"
import { zodResolver } from "@hookform/resolvers/zod"
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
    content: z
        .string()
        .min(1, "Message content is required"),
    // .max(2000, "Telegram messages cannot exceed 2000 characters"),
    webhookUrl: z.string().min(1, "Webhook URL is required"),
    chat_id: z.string()

})

export type TelegramFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: TelegramFormValues) => void
    defaultValues?: Partial<TelegramFormValues>;
}

export const TelegramDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {}
}: Props) => {

    const form = useForm<TelegramFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || "",
            content: defaultValues.content || "",
            webhookUrl: defaultValues.webhookUrl || "",
            chat_id: defaultValues.chat_id || ""
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                content: defaultValues.content || "",
                webhookUrl: defaultValues.webhookUrl || "",
                chat_id: defaultValues.chat_id || ""
            })
        }
    }, [open, defaultValues, form])

    const watchVariableName = form.watch("variableName") || "telegramVar"

    const handleSubmit = (values: TelegramFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Added max-h and overflow-y-auto to handle the taller form gracefully */}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Telegram Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure the Telegram webhook settings for this node
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
                                            placeholder="myTelegram"
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
                            name="webhookUrl"
                            render={({ field }) => (

                                <FormItem>
                                    <FormLabel>
                                        Webhook URL
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage/..." {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Get this from Telegram: Search @BotFather and open the verified bot → Tap Start → Send the command /newbot and follow the instructions
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* https://api.telegram.org/bot8681230656:AAE4H1yC7Ks1Td6FsCF2p_CS_EPJceUhVpg/sendMessage */}

                        <FormField
                            control={form.control}
                            name="chat_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Chat ID</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="1234567890" />
                                    </FormControl>
                                    <FormDescription>
                                        Enter the Telegram Chat ID where messages should be sent. To get this, open Telegram and search for <strong>@userinfobot</strong>, start the bot, and copy the ID it replies with. For group or channel IDs you may need to add an ID bot there first.
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
                                        Sets the behavior of the assistant. Use {"{{variables}}"} for dynamic values or {"{{json variable}}"} to stringify objects.
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
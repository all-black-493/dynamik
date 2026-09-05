"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const PRESETS = [
    { value: "*/15 * * * *", label: "Every 15 minutes" },
    { value: "0 * * * *", label: "Hourly" },
    { value: "0 9 * * *", label: "Daily at 09:00" },
    { value: "0 9 * * 1-5", label: "Weekdays at 09:00" },
    { value: "0 9 * * 1", label: "Mondays at 09:00" },
    { value: "0 9 1 * *", label: "First of the month" },
    { value: "custom", label: "Custom schedule" }
] as const

const formSchema = z.object({
    cron: z.string().min(1, "A schedule is required"),
    timezone: z.string().optional(),
    enabled: z.boolean()
})

export type ScheduleTriggerFormValues = z.infer<typeof formSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: ScheduleTriggerFormValues) => void
    defaultValues?: Partial<ScheduleTriggerFormValues>;
}

export const ScheduleTriggerDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {

    const form = useForm<ScheduleTriggerFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            cron: defaultValues.cron || "0 9 * * 1-5",
            timezone: defaultValues.timezone || "UTC",
            enabled: defaultValues.enabled ?? true
        }
    })

    useEffect(() => {
        if (open) {
            form.reset({
                cron: defaultValues.cron || "0 9 * * 1-5",
                timezone: defaultValues.timezone || "UTC",
                enabled: defaultValues.enabled ?? true
            })
        }
    }, [open, defaultValues, form])

    const cron = form.watch("cron")
    const isPreset = PRESETS.some((preset) => preset.value === cron)

    const handleSubmit = (values: ScheduleTriggerFormValues) => {
        onSubmit(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Schedule</DialogTitle>
                    <DialogDescription>
                        Runs this workflow on its own, without anyone pressing anything
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
                        <FormItem>
                            <FormLabel>How often</FormLabel>
                            <Select
                                value={isPreset ? cron : "custom"}
                                onValueChange={(value) => {
                                    if (value !== "custom") form.setValue("cron", value)
                                }}
                            >
                                <FormControl>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {PRESETS.map((preset) => (
                                        <SelectItem key={preset.value} value={preset.value}>
                                            {preset.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormItem>

                        <FormField
                            control={form.control}
                            name="cron"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Schedule</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="font-mono" placeholder="0 9 * * 1-5" />
                                    </FormControl>
                                    <FormDescription>
                                        Cron format. The finest step is one minute.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="timezone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Timezone</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value ?? ""} className="font-mono" placeholder="Africa/Nairobi" />
                                    </FormControl>
                                    <FormDescription>Defaults to UTC</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="enabled"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-1 pr-6">
                                        <FormLabel>Active</FormLabel>
                                        <FormDescription>
                                            Turn off to stop it running without deleting the schedule
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
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

"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CopyIcon } from "lucide-react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
// import { generateGoogleFormScript } from "./utils"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export const MPESATriggerDialog = ({
    open,
    onOpenChange
}: Props) => {

    const params = useParams()
    const workflowId = params.workflowId as string;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL! || "http://localhost:3000"

    const webhookUrl = `${baseUrl}/api/webhooks/mpesa?workflowId=${workflowId}`

    const copyToClipboard = async () => {
        try {
            navigator.clipboard.writeText(webhookUrl)
            toast.success("Webhook URL copied to clipboard")
        } catch {
            toast.error("Failed to copy URL")
        }
    }
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        MPESA Trigger Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure this webhook URL in your Safaricom Developers Portal to trigger this workflow on payment events.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="webhook-url">
                            Webhook URL
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="webhook-url"
                                value={webhookUrl}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={copyToClipboard}
                            >
                                <CopyIcon className="size-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">
                            Setup instructions
                        </h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Sign up to the developer portal: https://developer.safaricom.co.ke/</li>
                            <li>Create a test app on Sandbox → Get Started</li>
                            <li>My Apps → Create New App → Fill required fields → click “Create App”</li>
                            <li>Navigate to the “APIs” tab</li>
                            <li>Choose the API you need to test</li>
                            <li>Click on the “Simulate” button</li>
                        </ol>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">
                            Available Variables
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                        </ul>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
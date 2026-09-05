"use client"

import { createId } from "@paralleldrive/cuid2"
import { useReactFlow } from "@xyflow/react"
import {
    BotIcon,
    ClockIcon,
    CodeIcon,
    FilterIcon,
    GitBranchIcon,
    GitMergeIcon,
    GlobeIcon,
    MonitorIcon,
    MousePointerIcon,
    RepeatIcon,
    SplitIcon
} from "lucide-react"
import Image from "next/image"
import { useCallback } from "react"
import { toast } from "sonner"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet"
import { NodeType } from "@/generated/prisma"

export type NodeTypeOption = {
    type: NodeType
    label: string
    description: string
    icon: React.ComponentType<{ className?: string }> | string
}

export type NodeCategory = {
    id: string
    label: string
    hint: string
    nodes: NodeTypeOption[]
}

/**
 * The picker, grouped by what a node is for rather than by one long list.
 *
 * Triggers start a run, core nodes shape it, AI nodes think, and actions reach
 * outside. Ordered so the list reads in the order a workflow is built.
 */
export const nodeCategories: NodeCategory[] = [
    {
        id: "triggers",
        label: "Triggers",
        hint: "Start a workflow",
        nodes: [
            {
                type: NodeType.MANUAL_TRIGGER,
                label: "Trigger manually",
                description: "Run it yourself, from the editor",
                icon: MousePointerIcon
            },
            {
                type: NodeType.GOOGLE_FORM_TRIGGER,
                label: "Google Form",
                description: "A form is submitted",
                icon: "/logos/googleform.svg"
            },
            {
                type: NodeType.STRIPE_TRIGGER,
                label: "Stripe",
                description: "A Stripe event arrives",
                icon: "/logos/stripe.svg"
            },
            {
                type: NodeType.MPESA_TRIGGER,
                label: "M-Pesa",
                description: "An M-Pesa payment arrives",
                icon: "/logos/mpesa.png"
            }
        ]
    },
    {
        id: "core",
        label: "Core",
        hint: "Decide, repeat and pause",
        nodes: [
            {
                type: NodeType.IF,
                label: "If",
                description: "Two paths, one condition",
                icon: GitBranchIcon
            },
            {
                type: NodeType.SWITCH,
                label: "Switch",
                description: "One path per rule",
                icon: SplitIcon
            },
            {
                type: NodeType.FILTER,
                label: "Filter",
                description: "Stop unless conditions hold",
                icon: FilterIcon
            },
            {
                type: NodeType.MERGE,
                label: "Merge",
                description: "Bring branches back together",
                icon: GitMergeIcon
            },
            {
                type: NodeType.LOOP,
                label: "Loop",
                description: "Repeat for each item",
                icon: RepeatIcon
            },
            {
                type: NodeType.WAIT,
                label: "Wait",
                description: "Pause, then carry on",
                icon: ClockIcon
            },
            {
                type: NodeType.HTTP_REQUEST,
                label: "HTTP Request",
                description: "Call any API",
                icon: GlobeIcon
            },
            {
                type: NodeType.CODE,
                label: "Code",
                description: "Transform data with JavaScript",
                icon: CodeIcon
            }
        ]
    },
    {
        id: "ai",
        label: "AI",
        hint: "Generate and reason",
        nodes: [
            {
                type: NodeType.AI_AGENT,
                label: "AI Agent",
                description: "Reasons, and calls tools you attach",
                icon: BotIcon
            },
            {
                type: NodeType.OPENAI,
                label: "OpenAI",
                description: "Generate text",
                icon: "/logos/openai.svg"
            },
            {
                type: NodeType.ANTHROPIC,
                label: "Anthropic",
                description: "Generate text",
                icon: "/logos/anthropic.svg"
            },
            {
                type: NodeType.GEMINI,
                label: "Gemini",
                description: "Generate text",
                icon: "/logos/gemini.svg"
            },
            {
                type: NodeType.GROK,
                label: "Grok",
                description: "Generate text",
                icon: "/logos/grok.svg"
            },
            {
                type: NodeType.DEEPSEEK,
                label: "DeepSeek",
                description: "Generate text",
                icon: "/logos/deepseek.svg"
            },
            {
                type: NodeType.PERPLEXITY,
                label: "Perplexity",
                description: "Generate text, with search",
                icon: "/logos/perplexity.svg"
            }
        ]
    },
    {
        id: "data",
        label: "Data",
        hint: "Query and store",
        nodes: [
            {
                type: NodeType.POSTGRES,
                label: "Postgres",
                description: "Query a database, or Redshift",
                icon: "/logos/postgresql.svg"
            },
            {
                type: NodeType.DISPLAY,
                label: "Display",
                description: "Show a result on the canvas",
                icon: MonitorIcon
            }
        ]
    },
    {
        id: "actions",
        label: "Actions",
        hint: "Send and update",
        nodes: [
            {
                type: NodeType.SLACK,
                label: "Slack",
                description: "Send a message",
                icon: "/logos/slack.svg"
            },
            {
                type: NodeType.DISCORD,
                label: "Discord",
                description: "Send a message",
                icon: "/logos/discord.svg"
            },
            {
                type: NodeType.TELEGRAM,
                label: "Telegram",
                description: "Send a message",
                icon: "/logos/telegram.svg"
            },
            {
                type: NodeType.WHATSAPP,
                label: "WhatsApp",
                description: "Send a message",
                icon: "/logos/whatsapp.svg"
            },
            {
                type: NodeType.TIKTOK,
                label: "TikTok",
                description: "Post a video",
                icon: "/logos/tiktok.svg"
            },
            {
                type: NodeType.SALESFORCE,
                label: "Salesforce",
                description: "Read or write records",
                icon: "/logos/salesforce.svg"
            },
            {
                type: NodeType.HUBSPOT,
                label: "HubSpot",
                description: "Read or write records",
                icon: "/logos/hubspot.svg"
            },
            {
                type: NodeType.ODOO,
                label: "Odoo",
                description: "Read or write any model",
                icon: "/logos/odoo.svg"
            }
        ]
    }
]

interface NodeSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void
    children: React.ReactNode
}

export function NodeSelector({
    open,
    onOpenChange,
    children
}: NodeSelectorProps) {

    const { setNodes, getNodes, screenToFlowPosition } = useReactFlow()

    const handleNodeSelect = useCallback((selection: NodeTypeOption) => {
        if (selection.type === NodeType.MANUAL_TRIGGER) {
            const nodes = getNodes()
            const hasManualTrigger = nodes.some(
                (node) => node.type === NodeType.MANUAL_TRIGGER,
            )

            if (hasManualTrigger) {
                toast.error("Only one manual trigger is allowed per workflow")
                return
            }
        }

        setNodes((nodes) => {
            const hasInitialTrigger = nodes.some(
                (node) => node.type === NodeType.INITIAL
            )

            const centerX = window.innerWidth / 2
            const centerY = window.innerHeight / 2

            const flowPosition = screenToFlowPosition({
                x: centerX + (Math.random() - 0.5) * 200,
                y: centerY + (Math.random() - 0.5) * 200,
            })

            const newNode = {
                id: createId(),
                data: {},
                position: flowPosition,
                type: selection.type,
            }

            if (hasInitialTrigger) {
                return [newNode]
            }

            return [...nodes, newNode]
        })

        onOpenChange(false)
    }, [
        setNodes,
        getNodes,
        onOpenChange,
        screenToFlowPosition
    ])

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Add a node</SheetTitle>
                    <SheetDescription>
                        Start with a trigger, then build outwards.
                    </SheetDescription>
                </SheetHeader>

                <div className="pb-8">
                    {nodeCategories.map((category) => (
                        <section key={category.id}>
                            <div className="sticky top-0 z-10 flex items-baseline gap-2 bg-background px-4 py-2">
                                <h3 className="font-medium text-sm">{category.label}</h3>
                                <span className="text-muted-foreground text-xs">
                                    {category.hint}
                                </span>
                            </div>

                            {category.nodes.map((nodeType) => {
                                const Icon = nodeType.icon

                                return (
                                    <button
                                        type="button"
                                        key={nodeType.type}
                                        className="w-full cursor-pointer border-transparent border-l-2 px-4 py-3 text-left hover:border-l-primary hover:bg-accent/40"
                                        onClick={() => handleNodeSelect(nodeType)}
                                    >
                                        <div className="flex w-full items-center gap-4 overflow-hidden">
                                            {typeof Icon === "string" ? (
                                                <Image
                                                    src={Icon}
                                                    alt=""
                                                    width={24}
                                                    height={24}
                                                    className="size-6 rounded-sm object-contain"
                                                />
                                            ) : (
                                                <Icon className="size-5 text-muted-foreground" />
                                            )}
                                            <div className="flex flex-col items-start">
                                                <span className="font-medium text-sm">
                                                    {nodeType.label}
                                                </span>
                                                <span className="text-muted-foreground text-xs">
                                                    {nodeType.description}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </section>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    )
}

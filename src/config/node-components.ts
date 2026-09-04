import { InitialNode } from "@/components/initial-node";
import { AnthropicNode } from "@/features/executions/components/anthropic/node";
import { DeepseekNode } from "@/features/executions/components/deepseek/node";
import { DiscordNode } from "@/features/executions/components/discord/node";
import { GeminiNode } from "@/features/executions/components/gemini/node";
import { GrokNode } from "@/features/executions/components/grok/node";
import { HttpRequestNode } from "@/features/executions/components/http-request/node";
import { OpenAINode } from "@/features/executions/components/openai/node";
import { PerplexityNode } from "@/features/executions/components/perplexity/node";
import { SlackNode } from "@/features/executions/components/slack/node";
import { TelegramNode } from "@/features/executions/components/telegram/node";
import { TiktokNode } from "@/features/executions/components/tiktok/node";
import { WhatsappNode } from "@/features/executions/components/whatsapp/node";
import { SalesforceNode } from "@/features/executions/components/salesforce/node";
import { HubspotNode } from "@/features/executions/components/hubspot/node";
import { IfNode } from "@/features/executions/components/if/node";
import { LoopNode } from "@/features/executions/components/loop/node";
import { SwitchNode } from "@/features/executions/components/switch/node";
import { MergeNode } from "@/features/executions/components/merge/node";
import { FilterNode } from "@/features/executions/components/filter/node";
import { WaitNode } from "@/features/executions/components/wait/node";
import { PostgresNode } from "@/features/executions/components/postgres/node";
import { DisplayNode } from "@/features/executions/components/display/node";
import { OdooNode } from "@/features/executions/components/odoo/node";
import GoogleFormTrigger from "@/features/triggers/components/google-form-trigger/node";
import ManualTriggerNode from "@/features/triggers/components/manual-trigger/node";
import MPESATrigger from "@/features/triggers/components/MPESA-trigger/node";
import StripeTrigger from "@/features/triggers/components/stripe-trigger/node";
import { NodeType } from "@/generated/prisma";
import { NodeTypes } from "@xyflow/react";

export const nodeComponents = {
    [NodeType.INITIAL]: InitialNode,
    [NodeType.HTTP_REQUEST]: HttpRequestNode,
    [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
    [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTrigger,
    [NodeType.STRIPE_TRIGGER]:StripeTrigger,
    [NodeType.MPESA_TRIGGER]:MPESATrigger,
    [NodeType.GEMINI]:GeminiNode,
    [NodeType.OPENAI]:OpenAINode,
    [NodeType.DEEPSEEK]:DeepseekNode,
    [NodeType.GROK]: GrokNode,
    [NodeType.PERPLEXITY]: PerplexityNode,
    [NodeType.ANTHROPIC]:AnthropicNode,
    [NodeType.DISCORD]:DiscordNode,
    [NodeType.SLACK]:SlackNode,
    [NodeType.TELEGRAM]:TelegramNode,
    [NodeType.TIKTOK]:TiktokNode,
    [NodeType.WHATSAPP]: WhatsappNode,
    [NodeType.SALESFORCE]: SalesforceNode,
    [NodeType.HUBSPOT]: HubspotNode,
    [NodeType.IF]: IfNode,
    [NodeType.LOOP]: LoopNode,
    [NodeType.SWITCH]: SwitchNode,
    [NodeType.MERGE]: MergeNode,
    [NodeType.FILTER]: FilterNode,
    [NodeType.WAIT]: WaitNode,
    [NodeType.POSTGRES]: PostgresNode,
    [NodeType.DISPLAY]: DisplayNode,
    [NodeType.ODOO]: OdooNode

} as const satisfies NodeTypes

export type RegisteredNodeType = keyof typeof nodeComponents
import { NodeType } from "@/generated/prisma";
import { NodeExecutor } from "./types";
import { manualTriggerExecutor } from "@/features/triggers/components/manual-trigger/executor";
import { httpRequestExecutor } from "../components/http-request/executor";
import { googleFormTriggerExecutor } from "@/features/triggers/components/google-form-trigger/executor";
import { MPESATriggerExecutor } from "@/features/triggers/components/MPESA-trigger/executor";
import { stripeTriggerExecutor } from "@/features/triggers/components/stripe-trigger/executor";
import { geminiExecutor } from "../components/gemini/executor";
import { anthropicExecutor } from "../components/anthropic/executor";
import { deepseekExecutor } from "../components/deepseek/executor";
import { grokExecutor } from "../components/grok/executor";
import { OpenAIExecutor } from "../components/openai/executor";
import { perplexityExecutor } from "../components/perplexity/executor";
import { discordExecutor } from "../components/discord/executor";
import { slackExecutor } from "../components/slack/executor";
import { telegramExecutor } from "../components/telegram/executor";
import { tiktokExecutor } from "../components/tiktok/executor";
import { whatsappExecutor } from "../components/whatsapp/executor";
import { salesforceExecutor } from "../components/salesforce/executor";
import { hubspotExecutor } from "../components/hubspot/executor";
import { ifExecutor } from "../components/if/executor";
import { loopExecutor } from "../components/loop/executor";
import { switchExecutor } from "../components/switch/executor";
import { mergeExecutor } from "../components/merge/executor";
import { filterExecutor } from "../components/filter/executor";
import { waitExecutor } from "../components/wait/executor";
import { postgresExecutor } from "../components/postgres/executor";
import { displayExecutor } from "../components/display/executor";
import { odooExecutor } from "../components/odoo/executor";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
    [NodeType.INITIAL]: manualTriggerExecutor,
    [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
    [NodeType.HTTP_REQUEST]: httpRequestExecutor,
    [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
    [NodeType.STRIPE_TRIGGER]: stripeTriggerExecutor,
    [NodeType.MPESA_TRIGGER]: MPESATriggerExecutor,
    [NodeType.GEMINI]: geminiExecutor,
    [NodeType.ANTHROPIC]: anthropicExecutor,
    [NodeType.DEEPSEEK]: deepseekExecutor,
    [NodeType.GROK]:grokExecutor,
    [NodeType.OPENAI]:OpenAIExecutor,
    [NodeType.PERPLEXITY]:perplexityExecutor,
    [NodeType.DISCORD]: discordExecutor,
    [NodeType.SLACK]: slackExecutor,
    [NodeType.TELEGRAM]:telegramExecutor,
    [NodeType.TIKTOK]: tiktokExecutor,
    [NodeType.WHATSAPP]: whatsappExecutor,
    [NodeType.SALESFORCE]: salesforceExecutor,
    [NodeType.HUBSPOT]: hubspotExecutor,
    [NodeType.IF]: ifExecutor,
    [NodeType.LOOP]: loopExecutor,
    [NodeType.SWITCH]: switchExecutor,
    [NodeType.MERGE]: mergeExecutor,
    [NodeType.FILTER]: filterExecutor,
    [NodeType.WAIT]: waitExecutor,
    [NodeType.POSTGRES]: postgresExecutor,
    [NodeType.DISPLAY]: displayExecutor,
    [NodeType.ODOO]: odooExecutor
}

export const getExecutor = (type: NodeType): NodeExecutor => {
    const executor = executorRegistry[type]
    if (!executor) {
        throw new Error(`No executor found for node type: ${type}`)
    }
    return executor
}
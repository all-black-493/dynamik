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
    [NodeType.TELEGRAM]:discordExecutor,
    [NodeType.TIKTOK]: discordExecutor,
    [NodeType.WHATSAPP]: discordExecutor
}

export const getExecutor = (type: NodeType): NodeExecutor => {
    const executor = executorRegistry[type]
    if (!executor) {
        throw new Error(`No executor found for node type: ${type}`)
    }
    return executor
}
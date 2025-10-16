import prisma from "@/lib/db";
import { inngest } from "./client";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createXai } from '@ai-sdk/xai';
import { generateText } from "ai";

const google = createGoogleGenerativeAI()
const openai = createOpenAI()
const anthropic = createAnthropic()
const xai = createXai()

export const execute = inngest.createFunction(
    { id: "execute-ai" },
    { event: "execute/ai" },

    async ({ event, step }) => {
        await step.sleep("pretend-to-sleep", "12s")
        const { steps: geminiSteps } = await step.ai.wrap(
            "gemini-generate-text",
            generateText,
            {
                model: google("gemini-2.5-flash"),
                system: "You are a helpful assistant",
                prompt: "How close is the United States to becoming an explicitly Christian Nation today? And was Mrs E G White right in her prediction that the United States is veering to that direction?"
            }
        )

        const { steps: openaiSteps } = await step.ai.wrap(
            "openai-generate-text",
            generateText,
            {
                model: openai("gpt-5-pro"),
                system: "You are a helpful assistant",
                prompt: "How close is the United States to becoming an explicitly Christian Nation today? And was Mrs E G White right in her prediction that the United States is veering to that direction?"
            }
        )

        const { steps: anthropicSteps } = await step.ai.wrap(
            "anthropic-generate-text",
            generateText,
            {
                model: anthropic("claude-sonnet-4-5"),
                system: "You are a helpful assistant",
                prompt: "How close is the United States to becoming an explicitly Christian Nation today? And was Mrs E G White right in her prediction that the United States is veering to that direction?"
            }
        )

        const { steps: xaiSteps } = await step.ai.wrap(
            "xai-generate-text",
            generateText,
            {
                model: xai("grok-4"),
                system: "You are a helpful assistant",
                prompt: "How close is the United States to becoming an explicitly Christian Nation today? And was Mrs E G White right in her prediction that the United States is veering to that direction?"
            }
        )

        return {
            geminiSteps,
            openaiSteps,
            anthropicSteps,
            xaiSteps
        }
    },
);
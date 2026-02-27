import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import prisma from "@/lib/db";
import { topologicalSort } from "./utils";
import { ExecutionStatus, NodeType } from "@/generated/prisma";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { httpRequestChannel } from "./channels/http-request";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { stripeTriggerChannel } from "./channels/stripe-trigger";
import { mpesaTriggerChannel } from "./channels/mpesa-trigger";
import { geminiChannel } from "./channels/gemini";
import { OpenAIChannel } from "./channels/openai";
import { grokChannel } from "./channels/grok";
import { perplexityChannel } from "./channels/perplexity";
import { anthropicChannel } from "./channels/anthropic";
import { deepseekChannel } from "./channels/deepseek";
import { tiktokChannel } from "./channels/tiktok";
import { telegramChannel } from "./channels/telegram";
import { slackChannel } from "./channels/slack";
import { discordChannel } from "./channels/discord";
import { whatsappChannel } from "./channels/whatsapp";


export const executeWorkflow = inngest.createFunction(
    {
        id: "execute-workflow",
        retries: 0,
        onFailure: async ({ event, step }) => {
            return prisma.execution.update({
                where: { inngestEventId: event.data.event.id },
                data: {
                    status: ExecutionStatus.FAILED,
                    error: event.data.error.message,
                    errorStack: event.data.error.stack
                }
            })
        }
    },
    {
        event: "workflows/execute.workflow",
        channels: [
            httpRequestChannel(),
            manualTriggerChannel(),
            googleFormTriggerChannel(),
            stripeTriggerChannel(),
            mpesaTriggerChannel(),
            geminiChannel(),
            OpenAIChannel(),
            grokChannel(),
            perplexityChannel(),
            anthropicChannel(),
            deepseekChannel(),
            tiktokChannel(),
            telegramChannel(),
            slackChannel(),
            discordChannel(),
            whatsappChannel(),
        ]
    },

    async ({ event, step, publish }) => {

        const inngestEventId = event.id

        const workflowId = event.data.workflowId

        if (!inngestEventId || !workflowId) {
            throw new NonRetriableError("Event ID or Workflow ID is missing")
        }

        await step.run("create-execution", async () => {
            return prisma.execution.create({
                data: {
                    workflowId,
                    inngestEventId
                }
            })
        })

        const sorted_nodes = await step.run(
            "prepare-workflow",
            async () => {
                const workflow = await prisma.workflow.findUniqueOrThrow({
                    where: { id: workflowId },
                    include: {
                        nodes: true,
                        connections: true
                    }
                })

                return topologicalSort(workflow.nodes, workflow.connections)
            })

        const userId = await step.run("find-user-id", async () => {
            const workflow = await prisma.workflow.findUniqueOrThrow({
                where: { id: workflowId },
                select: {
                    userId: true
                }
            })

            return workflow.userId
        })

        let context = event.data.initialData || {}

        for (const node of sorted_nodes) {
            const executor = getExecutor(node.type as NodeType)
            context = await executor({
                data: node.data as Record<string, unknown>,
                nodeId: node.id,
                userId,
                context,
                step,
                publish
            })
        }

        await step.run("update-execution", async () => {
            return prisma.execution.update({
                where: { inngestEventId, workflowId },
                data: {
                    status: ExecutionStatus.SUCCESS,
                    completedAt: new Date(),
                    output: context,
                }
            })
        })

        return {
            workflowId,
            result: context
        }
    },
);
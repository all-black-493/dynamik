import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import prisma from "@/lib/db";
import { ExecutionStatus, NodeType } from "@/generated/prisma";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { toOutcome } from "@/features/executions/lib/types";
import { createExecutionPlan } from "@/features/executions/lib/execution-plan";
import { scopeStep } from "@/features/executions/lib/scoped-step";
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
import { salesforceChannel } from "./channels/salesforce";
import { hubspotChannel } from "./channels/hubspot";
import { ifChannel } from "./channels/if";
import { loopChannel } from "./channels/loop";
import { switchChannel } from "./channels/switch";
import { mergeChannel } from "./channels/merge";
import { filterChannel } from "./channels/filter";
import { waitChannel } from "./channels/wait";
import { postgresChannel } from "./channels/postgres";


export const executeWorkflow = inngest.createFunction(
    {
        id: "execute-workflow",
        retries: process.env.NODE_ENV === "production" ? 3 : 0,
        onFailure: async ({ event }) => {
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
            salesforceChannel(),
            hubspotChannel(),
            ifChannel(),
            loopChannel(),
            switchChannel(),
            mergeChannel(),
            filterChannel(),
            waitChannel(),
            postgresChannel(),
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

        const graph = await step.run(
            "prepare-workflow",
            async () => {
                const workflow = await prisma.workflow.findUniqueOrThrow({
                    where: { id: workflowId },
                    include: {
                        nodes: true,
                        connections: true
                    }
                })

                return {
                    nodes: workflow.nodes,
                    connections: workflow.connections
                }
            })

        // A node opts into waiting for every inbound branch through its own
        // data, so the engine stays unaware of which node types do it.
        const requiresAllInputs = (node: { data: unknown }) =>
            (node.data as { waitForAll?: boolean } | null)?.waitForAll === true

        const plan = createExecutionPlan(graph.nodes, graph.connections, {
            requiresAllInputs
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

        for (const node of plan.sorted) {
            if (!plan.isActive(node.id)) {
                plan.skip(node.id)
                continue
            }

            const executor = getExecutor(node.type as NodeType)

            const result = await executor({
                data: node.data as Record<string, unknown>,
                nodeId: node.id,
                userId,
                context,
                step,
                publish
            })

            const outcome = toOutcome(result)
            context = outcome.context

            if (outcome.loop) {
                const { output, items, as } = outcome.loop
                const body = plan.subgraphFrom(node.id, output)
                const outerKeys = new Set(Object.keys(context))
                const results: Record<string, unknown>[] = []

                for (let index = 0; index < items.length; index++) {
                    // Each pass gets a fresh plan so branching inside the body
                    // works, and a fresh view of the outer context so one
                    // iteration cannot leak into the next.
                    const bodyPlan = createExecutionPlan(body.nodes, body.connections, {
                        requiresAllInputs
                    })

                    let iterationContext: Record<string, unknown> = {
                        ...context,
                        [as]: {
                            item: items[index],
                            index,
                            total: items.length,
                            isFirst: index === 0,
                            isLast: index === items.length - 1
                        }
                    }

                    for (const bodyNode of bodyPlan.sorted) {
                        if (!bodyPlan.isActive(bodyNode.id)) {
                            bodyPlan.skip(bodyNode.id)
                            continue
                        }

                        const bodyResult = await getExecutor(bodyNode.type as NodeType)({
                            data: bodyNode.data as Record<string, unknown>,
                            nodeId: bodyNode.id,
                            userId,
                            context: iterationContext,
                            // Step ids are namespaced per iteration, otherwise
                            // the second pass would be handed the first pass's
                            // memoized result instead of doing the work.
                            step: scopeStep(step, `${node.id}-${index}`),
                            publish
                        })

                        const bodyOutcome = toOutcome(bodyResult)
                        iterationContext = bodyOutcome.context
                        bodyPlan.advance(bodyNode.id, bodyOutcome.outputs)
                    }

                    // Only what this pass produced, so the collected results are
                    // the loop's output rather than a copy of the whole context.
                    results.push(
                        Object.fromEntries(
                            Object.entries(iterationContext)
                                .filter(([key]) => !outerKeys.has(key))
                        )
                    )
                }

                context = {
                    ...context,
                    [as]: {
                        count: results.length,
                        results
                    }
                }
            }

            plan.advance(node.id, outcome.outputs)
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
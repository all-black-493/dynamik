import { PAGINATION } from "@/config/constants";
import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { NodeType, Prisma } from "@/generated/prisma";
import type { Node, Edge } from "@xyflow/react";
import prisma from "@/lib/db";
import { createTRPCRouter, premiumProcedure, protectedProcedure } from "@/trpc/init";
import { DEFAULT_OUTPUT } from "@/features/executions/lib/outputs";
import { getTemplate, templates } from "../lib/templates";
import { generateSlug } from "random-word-slugs";
import z from "zod";
import { sendWorkflowExecution } from "@/inngest/utils";

export const workflowsRouter = createTRPCRouter({

    execute: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const workflow = await prisma.workflow.findUniqueOrThrow({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id
                }
            })

            await sendWorkflowExecution({
                workflowId: input.id,
            })

            return workflow
        }),

    create: premiumProcedure.mutation(({ ctx }) => {
        return prisma.workflow.create({
            data: {
                name: generateSlug(3),
                userId: ctx.auth.user.id,
                nodes: {
                    create: {
                        type: NodeType.INITIAL,
                        position: {
                            x: 0,
                            y: 0
                        },
                        name: NodeType.INITIAL
                    },
                },
            },
        })
    }),

    listTemplates: protectedProcedure.query(() =>
        templates.map((template) => ({
            id: template.id,
            name: template.name,
            summary: template.summary,
            requires: template.requires,
            nodeCount: template.nodes.length
        }))
    ),

    createFromTemplate: premiumProcedure
        .input(z.object({ templateId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const template = getTemplate(input.templateId)

            if (!template) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "That template no longer exists"
                })
            }

            // Template keys are local to the definition, so every instance gets
            // fresh ids and the same template can be used repeatedly.
            const idFor = new Map(
                template.nodes.map((node) => [node.key, createId()])
            )

            return prisma.$transaction(async (tx) => {
                const workflow = await tx.workflow.create({
                    data: {
                        name: template.name,
                        userId: ctx.auth.user.id
                    }
                })

                await tx.node.createMany({
                    data: template.nodes.map((node) => ({
                        id: idFor.get(node.key) as string,
                        workflowId: workflow.id,
                        name: node.type,
                        type: node.type,
                        position: node.position as Prisma.InputJsonValue,
                        data: (node.data ?? {}) as Prisma.InputJsonValue,
                        parentNodeId: node.parentKey
                            ? (idFor.get(node.parentKey) as string)
                            : null
                    }))
                })

                await tx.connection.createMany({
                    data: template.connections.map((connection) => ({
                        workflowId: workflow.id,
                        fromNodeId: idFor.get(connection.from) as string,
                        toNodeId: idFor.get(connection.to) as string,
                        fromOutput: connection.fromOutput ?? DEFAULT_OUTPUT,
                        toInput: DEFAULT_OUTPUT
                    }))
                })

                return workflow
            })
        }),

    remove: protectedProcedure
        .input(z.object({
            id: z.string()
        }))
        .mutation(({ ctx, input }) => {
            return prisma.workflow.delete({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id
                }
            })
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                nodes: z.array(
                    z.object({
                        id: z.string(),
                        type: z.string().nullish(),
                        position: z.object({
                            x: z.number(),
                            y: z.number()
                        }),
                        data: z.record(z.string(), z.any()).optional(),
                        // React Flow's own field name for a docked child.
                        parentId: z.string().nullish()
                    })
                ),
                edges: z.array(
                    z.object({
                        source: z.string(),
                        target: z.string(),
                        sourceHandle: z.string().nullish(),
                        targetHandle: z.string().nullish()
                    })
                )
            }))
        .mutation(async ({ ctx, input }) => {
            const { id, nodes, edges } = input

            const workflow = await prisma.workflow.findUniqueOrThrow({
                where: {
                    id,
                    userId: ctx.auth.user.id
                },
            })
            return await prisma.$transaction(async (tx) => {

                await tx.node.deleteMany({
                    where: { workflowId: id },
                })

                await tx.node.createMany({
                    data: nodes.map((node) => ({
                        id: node.id,
                        workflowId: id,
                        name: node.type || "unknown",
                        type: node.type as NodeType,
                        position: node.position,
                        data: node.data || {},
                        parentNodeId: node.parentId ?? null
                    }))
                })

                await tx.connection.createMany({
                    data: edges.map((edge) => ({
                        workflowId: id,
                        fromNodeId: edge.source,
                        toNodeId: edge.target,
                        fromOutput: edge.sourceHandle || "main",
                        toInput: edge.targetHandle || "main",
                    }))
                })

                await tx.workflow.update({
                    where: { id },
                    data: { updatedAt: new Date() }
                })

                return workflow
            })
        }),

    updateName: protectedProcedure
        .input(z.object({
            id: z.string(), name: z.string().min(1)
        }))
        .mutation(({ ctx, input }) => {
            return prisma.workflow.update({
                where: { id: input.id, userId: ctx.auth.user.id },
                data: { name: input.name }
            })
        }),

    getOne: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const workflow = await prisma.workflow.findUniqueOrThrow({
                where: { id: input.id, userId: ctx.auth.user.id },
                include: {
                    nodes: true,
                    connections: true
                }
            })

            const nodes: Node[] = workflow.nodes.map((node) => ({
                id: node.id,
                type: node.type,
                position: node.position as { x: number, y: number },
                data: (node.data as Record<string, unknown>) || {},
                ...(node.parentNodeId ? { parentId: node.parentNodeId } : {})
            }))

            const edges: Edge[] = workflow.connections.map((connection) => ({
                id: connection.id,
                source: connection.fromNodeId,
                target: connection.toNodeId,
                sourceHandle: connection.fromOutput,
                targetHandle: connection.toInput
            }))

            return {
                id: workflow.id,
                name: workflow.name,
                nodes,
                edges
            }
        }),

    getMany: protectedProcedure
        .input(z.object({
            page: z.number().default(PAGINATION.DEFAULT_PAGE),
            page_size: z
                .number()
                .min(PAGINATION.MIN_PAGE_SIZE)
                .max(PAGINATION.MAX_PAGE_SIZE)
                .default(PAGINATION.DEFAULT_PAGE_SIZE),
            search: z.string().default("")
        }))
        .query(async ({ ctx, input }) => {

            const { page, page_size, search } = input
            const [items, totalCount] = await Promise.all([
                prisma.workflow.findMany({
                    skip: (page - 1) * page_size,
                    take: page_size,
                    where: {
                        userId: ctx.auth.user.id,
                        name: {
                            contains: search,
                            mode: "insensitive"
                        }
                    },
                    orderBy: {
                        updatedAt: "desc",
                    }
                }),
                prisma.workflow.count({
                    where: {
                        userId: ctx.auth.user.id,
                        name: {
                            contains: search,
                            mode: "insensitive"
                        }
                    }
                })
            ])
            const totalPages = Math.ceil(totalCount / page_size)
            const hasNextPage = page < totalPages
            const hasPreviousPage = page > 1

            return {
                items,
                page,
                page_size,
                totalCount,
                totalPages,
                hasNextPage,
                hasPreviousPage
            }

        })
})
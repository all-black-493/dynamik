import { PAGINATION } from "@/config/constants";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";

export const executionsRouter = createTRPCRouter({

    getOne: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return prisma.execution.findUniqueOrThrow({
                where: {
                    id: input.id,
                    workflow: {
                        userId: ctx.auth.user.id
                    }
                },
                include:{
                    workflow:{
                        select:{
                            id: true,
                            name: true
                        }
                    }
                }
            })

        }),

    getMany: protectedProcedure
        .input(z.object({
            page: z.number().default(PAGINATION.DEFAULT_PAGE),
            page_size: z
                .number()
                .min(PAGINATION.MIN_PAGE_SIZE)
                .max(PAGINATION.MAX_PAGE_SIZE)
                .default(PAGINATION.DEFAULT_PAGE_SIZE),
        }))
        .query(async ({ ctx, input }) => {

            const { page, page_size } = input
            const [items, totalCount] = await Promise.all([
                prisma.execution.findMany({
                    skip: (page - 1) * page_size,
                    take: page_size,
                    where: {
                        workflow: {
                            userId: ctx.auth.user.id
                        }

                    },
                    orderBy: {
                        startedAt: "desc",
                    },
                    include: {
                        workflow: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }),
                prisma.execution.count({
                    where: {
                        workflow: {
                            userId: ctx.auth.user.id
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

        }),

})
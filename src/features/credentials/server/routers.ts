import { PAGINATION } from "@/config/constants";
import { CredentialType } from "@/generated/prisma";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { createTRPCRouter, premiumProcedure, protectedProcedure } from "@/trpc/init";
import z from "zod";

// The encrypted secret never leaves the server. Every read path selects
// through this projection so a new query cannot leak `value` by omission.
const credentialFields = {
    id: true,
    name: true,
    type: true,
    createdAt: true,
    updatedAt: true,
    userId: true
} as const

export const credentialsRouter = createTRPCRouter({

    create: premiumProcedure
        .input(
            z.object({
                name: z.string().min(1, "Name is required"),
                type: z.enum(CredentialType),
                value: z.string().min(1, "Value is required")
            })
        )
        .mutation(({ ctx, input }) => {
            const { name, value, type } = input
            return prisma.credential.create({
                data: {
                    name,
                    userId: ctx.auth.user.id,
                    type,
                    value: encrypt(value),
                },
                select: credentialFields
            })
        }),

    remove: protectedProcedure
        .input(z.object({
            id: z.string()
        }))
        .mutation(({ ctx, input }) => {
            return prisma.credential.delete({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id
                },
                select: credentialFields
            })
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(1, "Name is required"),
                type: z.enum(CredentialType),
                value: z.string().min(1).optional()
            }))
        .mutation(async ({ ctx, input }) => {
            const { id, name, type, value } = input

            return prisma.credential.update({
                where: { id, userId: ctx.auth.user.id },
                data: {
                    name,
                    type,
                    // Omitted value means "keep the stored secret", so editing a
                    // credential's name never requires round-tripping the key.
                    ...(value ? { value: encrypt(value) } : {})
                },
                select: credentialFields
            })
        }),


    getOne: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return prisma.credential.findUniqueOrThrow({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id
                },
                select: credentialFields
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
            search: z.string().default("")
        }))
        .query(async ({ ctx, input }) => {

            const { page, page_size, search } = input
            const [items, totalCount] = await Promise.all([
                prisma.credential.findMany({
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
                    },
                    select: credentialFields
                }),
                prisma.credential.count({
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

        }),


    getByType: protectedProcedure
        .input(
            z.object({
                type: z.enum(CredentialType)
            })
        )
        .query(async ({ input, ctx }) => {
            const { type } = input

            return prisma.credential.findMany({
                where: { type, userId: ctx.auth.user.id },
                orderBy: {
                    updatedAt: "desc"
                },
                select: credentialFields
            })
        })
})
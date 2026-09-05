import { NodeType } from "@/generated/prisma"
import prisma from "@/lib/db"
import { CronExpressionParser } from "cron-parser"
import { inngest } from "./client"

/**
 * Starts workflows whose schedule is due.
 *
 * One function runs every minute and asks which schedules match, rather than
 * registering a cron per workflow. Inngest's crons are declared in code at
 * deploy time, so a per-workflow cron would mean a deploy every time somebody
 * edited a schedule. This way a schedule is data, editable like any other node
 * setting.
 */

/** Seconds are not accepted: the finest schedule this can honour is a minute. */
export const isValidCron = (expression: string): boolean => {
    try {
        CronExpressionParser.parse(expression)
        return true
    } catch {
        return false
    }
}

export const describeCron = (expression: string, timezone?: string): string | null => {
    try {
        const next = CronExpressionParser.parse(expression, {
            tz: timezone || "UTC"
        }).next()

        return next.toDate().toISOString()
    } catch {
        return null
    }
}

/**
 * True when the expression fires inside the given minute.
 *
 * Asked by taking the previous occurrence relative to the end of the minute and
 * checking it lands within it. Comparing against "now" directly would miss a
 * schedule whenever the function ran a second or two late, which it will.
 */
const firesDuring = (
    expression: string,
    timezone: string,
    minuteStart: Date
): boolean => {
    const minuteEnd = new Date(minuteStart.getTime() + 60_000)

    try {
        const previous = CronExpressionParser.parse(expression, {
            currentDate: minuteEnd,
            tz: timezone || "UTC"
        }).prev().toDate()

        return previous >= minuteStart && previous < minuteEnd
    } catch {
        return false
    }
}

export const runSchedules = inngest.createFunction(
    { id: "run-schedules" },
    { cron: "* * * * *" },
    async ({ step }) => {
        // Truncated to the minute so the same window is used throughout, and so
        // the idempotency key below is stable for every workflow in this tick.
        const minuteStart = new Date()
        minuteStart.setSeconds(0, 0)

        const scheduled = await step.run("find-scheduled-workflows", () =>
            prisma.node.findMany({
                where: { type: NodeType.SCHEDULE_TRIGGER },
                select: { id: true, workflowId: true, data: true }
            })
        )

        const due = scheduled.filter((node) => {
            const data = node.data as { cron?: string; timezone?: string; enabled?: boolean }

            if (data?.enabled === false) return false
            if (!data?.cron?.trim()) return false

            return firesDuring(data.cron, data.timezone ?? "UTC", minuteStart)
        })

        if (!due.length) {
            return { checked: scheduled.length, started: 0 }
        }

        const minuteKey = minuteStart.toISOString()

        await step.run("start-due-workflows", async () => {
            await inngest.send(
                due.map((node) => ({
                    name: "workflows/execute.workflow" as const,
                    data: {
                        workflowId: node.workflowId,
                        initialData: {
                            schedule: {
                                firedAt: minuteKey,
                                cron: (node.data as { cron?: string })?.cron ?? ""
                            }
                        }
                    },
                    // Keyed on the workflow and the minute, so a retry of this
                    // function cannot start the same workflow twice.
                    id: `schedule-${node.workflowId}-${minuteKey}`
                }))
            )

            return due.length
        })

        return { checked: scheduled.length, started: due.length }
    }
)

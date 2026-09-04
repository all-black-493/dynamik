import type { NodeExecutor } from "@/features/executions/lib/types";
import { waitChannel } from "@/inngest/channels/wait";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

const UNIT_MS: Record<string, number> = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000
}

/** A year. Long enough for any real pause, short enough to catch a bad unit. */
const MAX_WAIT_MS = 365 * 24 * 60 * 60 * 1000

type waitData = {
    variableName?: string;
    mode?: "duration" | "until";
    amount?: string;
    unit?: string;
    /** Template resolving to an ISO timestamp. */
    until?: string;
}

/**
 * Pauses the run.
 *
 * This is Inngest's durable sleep, not setTimeout: the function stops, nothing
 * is held open, and the run resumes later. A workflow can therefore wait days
 * without a process sitting idle, which is not something a serverless request
 * could do on its own.
 */
export const waitExecutor: NodeExecutor<waitData> = async ({
    data,
    nodeId,
    context,
    step,
    publish
}) => {

    const fail = async (message: string) => {
        await publish(waitChannel().status({ nodeId, status: "error" }))
        return new NonRetriableError(`Wait node: ${message}`)
    }

    await publish(waitChannel().status({ nodeId, status: "loading" }))

    const mode = data.mode ?? "duration"

    if (mode === "until") {
        const rendered = data.until
            ? Handlebars.compile(data.until)(context).trim()
            : ""

        if (!rendered) throw await fail("Timestamp is missing")

        const target = new Date(rendered)

        if (Number.isNaN(target.getTime())) {
            throw await fail(`"${rendered}" is not a date the node can read`)
        }

        await step.sleepUntil(`wait-${nodeId}`, target)

        await publish(waitChannel().status({ nodeId, status: "success" }))

        return data.variableName
            ? { ...context, [data.variableName]: { waitedUntil: target.toISOString() } }
            : context
    }

    const amount = Number(data.amount)
    const unit = data.unit ?? "seconds"
    const unitMs = UNIT_MS[unit]

    if (!unitMs) throw await fail(`Unknown unit "${unit}"`)

    if (!Number.isFinite(amount) || amount <= 0) {
        throw await fail(`"${data.amount ?? ""}" is not a positive number of ${unit}`)
    }

    const durationMs = amount * unitMs

    if (durationMs > MAX_WAIT_MS) {
        throw await fail(`Waiting ${amount} ${unit} is longer than the one year maximum`)
    }

    await step.sleep(`wait-${nodeId}`, durationMs)

    await publish(waitChannel().status({ nodeId, status: "success" }))

    return data.variableName
        ? { ...context, [data.variableName]: { waitedMs: durationMs } }
        : context
}

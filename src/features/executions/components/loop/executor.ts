import { loopOver, type NodeExecutor } from "@/features/executions/lib/types";
import { loopChannel } from "@/inngest/channels/loop";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

export const LOOP_OUTPUT_BODY = "loop"
export const LOOP_OUTPUT_DONE = "done"

/** Guards against a mistyped path turning into a runaway workflow. */
const DEFAULT_MAX_ITEMS = 100
const HARD_MAX_ITEMS = 1000

type loopData = {
    variableName?: string;
    /** Dotted path into the context, for example myQuery.result.records */
    itemsPath?: string;
    maxItems?: string;
}

/**
 * Reads a value at a dotted path.
 *
 * Handlebars renders to a string, which would turn an array into "[object
 * Object],[object Object]", so the array is taken from the context directly.
 */
const readPath = (context: Record<string, unknown>, path: string): unknown =>
    path
        .split(".")
        .filter(Boolean)
        .reduce<unknown>((current, segment) => {
            if (current === null || current === undefined) return undefined
            if (Array.isArray(current)) return current[Number(segment)]
            if (typeof current === "object") {
                return (current as Record<string, unknown>)[segment]
            }
            return undefined
        }, context)

export const loopExecutor: NodeExecutor<loopData> = async ({
    data,
    nodeId,
    context,
    publish
}) => {

    const fail = async (message: string) => {
        await publish(loopChannel().status({ nodeId, status: "error" }))
        return new NonRetriableError(`Loop node: ${message}`)
    }

    await publish(loopChannel().status({ nodeId, status: "loading" }))

    const variableName = data.variableName
    const itemsPath = data.itemsPath?.trim()

    if (!variableName) throw await fail("Variable name is missing")
    if (!itemsPath) throw await fail("Items path is missing")

    const value = readPath(context, itemsPath)

    if (value === undefined || value === null) {
        throw await fail(`Nothing found at "${itemsPath}"`)
    }

    if (!Array.isArray(value)) {
        throw await fail(
            `"${itemsPath}" is a ${typeof value}, not a list. Point at an array to iterate.`
        )
    }

    const requested = Number(data.maxItems ?? DEFAULT_MAX_ITEMS)
    const limit = Number.isFinite(requested) && requested > 0
        ? Math.min(requested, HARD_MAX_ITEMS)
        : DEFAULT_MAX_ITEMS

    const items = value.slice(0, limit)

    await publish(loopChannel().status({ nodeId, status: "success" }))

    // The body output is driven by the engine, so only "done" is activated here.
    return loopOver(
        context,
        { output: LOOP_OUTPUT_BODY, items, as: variableName },
        [LOOP_OUTPUT_DONE]
    )
}

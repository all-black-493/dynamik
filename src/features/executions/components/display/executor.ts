import type { NodeExecutor } from "@/features/executions/lib/types";
import {
    type DisplayKind,
    inferTypedValue,
    readPath,
    type TypedValue
} from "@/features/executions/lib/typed-values";
import { displayChannel } from "@/inngest/channels/display";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

type displayData = {
    variableName?: string;
    title?: string;
    /** Dotted path into the workflow data, for example myQuery.rows */
    source?: string;
    /** Leave unset to work the kind out from the value. */
    renderAs?: DisplayKind | "auto";
}

/**
 * Forces a value into the shape a chosen renderer needs.
 *
 * Inference is right most of the time, but a column of URLs is a table and a
 * single URL is an image, and only the author knows which they meant.
 */
const coerce = (value: unknown, kind: DisplayKind): TypedValue => {
    const inferred = inferTypedValue(value)

    if (inferred.kind === kind) return inferred

    switch (kind) {
        case "image":
        case "video":
        case "audio": {
            const url = typeof value === "string"
                ? value
                : (value as { url?: string })?.url
            if (typeof url !== "string") {
                throw new NonRetriableError(
                    `Display node: cannot show this as ${kind}, no URL found`
                )
            }
            return kind === "image"
                ? { kind, url }
                : kind === "video"
                    ? { kind, url }
                    : { kind, url }
        }
        case "markdown":
        case "text": {
            const text = typeof value === "string"
                ? value
                : JSON.stringify(value, null, 2)
            return { kind, text }
        }
        case "table":
            if (inferred.kind === "table") return inferred
            throw new NonRetriableError(
                "Display node: cannot show this as a table, expected a list of records"
            )
        case "graph":
            if (inferred.kind === "graph") return inferred
            throw new NonRetriableError(
                "Display node: cannot show this as a graph, expected nodes and edges"
            )
        default:
            return { kind: "json", value }
    }
}

export const displayExecutor: NodeExecutor<displayData> = async ({
    data,
    nodeId,
    context,
    publish
}) => {

    const fail = async (message: string) => {
        await publish(displayChannel().status({ nodeId, status: "error" }))
        return new NonRetriableError(`Display node: ${message}`)
    }

    await publish(displayChannel().status({ nodeId, status: "loading" }))

    const source = data.source?.trim()

    if (!source) throw await fail("Nothing chosen to display")

    const raw = readPath(context, source)

    if (raw === undefined) {
        throw await fail(`Nothing found at "${source}"`)
    }

    const title = data.title
        ? Handlebars.compile(data.title)(context)
        : undefined

    let value: TypedValue

    try {
        value = data.renderAs && data.renderAs !== "auto"
            ? coerce(raw, data.renderAs)
            : inferTypedValue(raw)
    } catch (error) {
        await publish(displayChannel().status({ nodeId, status: "error" }))
        throw error
    }

    await publish(displayChannel().output({ nodeId, title, value }))
    await publish(displayChannel().status({ nodeId, status: "success" }))

    // Also written into the context so it lands in the execution record, which
    // is what lets the run be reviewed after the fact rather than only watched.
    return data.variableName
        ? { ...context, [data.variableName]: { title, display: value } }
        : context
}

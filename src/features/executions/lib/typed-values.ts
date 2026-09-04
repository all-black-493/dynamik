/**
 * Typed values, so output can be rendered rather than only printed.
 *
 * Until now everything a node produced was untyped JSON, which the executions
 * page could do nothing with except stringify. Rendering an image, a table or a
 * graph means knowing what a value *is*.
 *
 * Two ways to know. A node that already knows can say so, by returning a value
 * built with one of the helpers below. Everything else is inferred from shape,
 * which is what makes this work with the twenty six nodes that predate it: a
 * Postgres query returns an array of flat objects, and that is a table whether
 * or not anyone labelled it one.
 *
 * Free of React and of Handlebars, so the executor and the canvas share it.
 */

export type DisplayKind =
    | "image"
    | "video"
    | "audio"
    | "table"
    | "graph"
    | "markdown"
    | "text"
    | "json"

/** A node in a rendered graph. */
export type GraphNode = { id: string; label?: string }
export type GraphEdge = { from: string; to: string; label?: string }

export type TypedValue =
    | { kind: "image"; url: string; alt?: string }
    | { kind: "video"; url: string; poster?: string }
    | { kind: "audio"; url: string }
    | { kind: "table"; columns: string[]; rows: Record<string, unknown>[] }
    | { kind: "graph"; nodes: GraphNode[]; edges: GraphEdge[] }
    | { kind: "markdown"; text: string }
    | { kind: "text"; text: string }
    | { kind: "json"; value: unknown }

/** Marks a value as already typed, so inference leaves it alone. */
const TYPED = "__display"

type Tagged = TypedValue & { [TYPED]: true }

const tag = (value: TypedValue): Tagged => ({ ...value, [TYPED]: true }) as Tagged

export const asImage = (url: string, alt?: string) => tag({ kind: "image", url, alt })
export const asVideo = (url: string, poster?: string) => tag({ kind: "video", url, poster })
export const asAudio = (url: string) => tag({ kind: "audio", url })
export const asMarkdown = (text: string) => tag({ kind: "markdown", text })

export const isTypedValue = (value: unknown): value is Tagged =>
    typeof value === "object" && value !== null && TYPED in value

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v)(\?|#|$)/i
const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|m4a)(\?|#|$)/i

const isUrl = (value: string) =>
    /^https?:\/\//i.test(value) || value.startsWith("data:")

/** Rows are a table when they are objects sharing a shape, not nested blobs. */
const asTableRows = (value: unknown[]): TypedValue | null => {
    const rows = value.filter(
        (row): row is Record<string, unknown> =>
            typeof row === "object" && row !== null && !Array.isArray(row)
    )

    if (rows.length !== value.length || rows.length === 0) return null

    const columns: string[] = []
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (!columns.includes(key)) columns.push(key)
        }
    }

    // Beyond a certain width a table is worse than the raw JSON.
    if (columns.length === 0 || columns.length > 24) return null

    return { kind: "table", columns, rows }
}

const asGraph = (value: Record<string, unknown>): TypedValue | null => {
    const nodes = value.nodes
    const edges = value.edges

    if (!Array.isArray(nodes) || !Array.isArray(edges)) return null

    const graphNodes: GraphNode[] = []
    for (const node of nodes) {
        if (typeof node === "string") {
            graphNodes.push({ id: node })
            continue
        }
        if (typeof node === "object" && node !== null) {
            const record = node as Record<string, unknown>
            const id = record.id ?? record.name
            if (typeof id === "string") {
                graphNodes.push({
                    id,
                    label: typeof record.label === "string" ? record.label : undefined
                })
                continue
            }
        }
        return null
    }

    const graphEdges: GraphEdge[] = []
    for (const edge of edges) {
        if (typeof edge !== "object" || edge === null) return null
        const record = edge as Record<string, unknown>
        // Accepts the shape this app already stores connections in, and the
        // plainer from/to a generating node would emit.
        const from = record.from ?? record.source ?? record.fromNodeId
        const to = record.to ?? record.target ?? record.toNodeId
        if (typeof from !== "string" || typeof to !== "string") return null
        graphEdges.push({
            from,
            to,
            label: typeof record.label === "string" ? record.label : undefined
        })
    }

    if (!graphNodes.length) return null

    return { kind: "graph", nodes: graphNodes, edges: graphEdges }
}

/**
 * Works out how to render a value.
 *
 * Ordered from most specific to least, ending at json, which always renders
 * something. Never throws: the display node should show whatever it was given
 * rather than failing a run over presentation.
 */
export const inferTypedValue = (value: unknown): TypedValue => {
    if (isTypedValue(value)) {
        const { [TYPED]: _tagged, ...rest } = value
        return rest as TypedValue
    }

    if (value === null || value === undefined) {
        return { kind: "text", text: "" }
    }

    if (typeof value === "string") {
        if (isUrl(value)) {
            if (IMAGE_EXTENSIONS.test(value) || value.startsWith("data:image/")) {
                return { kind: "image", url: value }
            }
            if (VIDEO_EXTENSIONS.test(value) || value.startsWith("data:video/")) {
                return { kind: "video", url: value }
            }
            if (AUDIO_EXTENSIONS.test(value) || value.startsWith("data:audio/")) {
                return { kind: "audio", url: value }
            }
        }
        return { kind: "text", text: value }
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return { kind: "text", text: String(value) }
    }

    if (Array.isArray(value)) {
        return asTableRows(value) ?? { kind: "json", value }
    }

    if (typeof value === "object") {
        const record = value as Record<string, unknown>

        const graph = asGraph(record)
        if (graph) return graph

        // A single wrapped collection, which is how most nodes return results:
        // { rows: [...] } from Postgres, { records: [...] } from Salesforce.
        for (const key of ["rows", "records", "results", "items", "data"]) {
            const nested = record[key]
            if (Array.isArray(nested)) {
                const table = asTableRows(nested)
                if (table) return table
            }
        }

        // A lone url field is a media value in all but name.
        const url = record.url ?? record.src
        if (typeof url === "string" && isUrl(url)) {
            return inferTypedValue(url)
        }

        return { kind: "json", value }
    }

    return { kind: "json", value }
}

/** Reads a dotted path, the same way the Loop node resolves its items. */
export const readPath = (source: unknown, path: string): unknown =>
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
        }, source)

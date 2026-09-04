"use client"

import type { GraphEdge, GraphNode, TypedValue } from "@/features/executions/lib/typed-values"

/**
 * Lays a graph out in columns by depth.
 *
 * Each node sits one column right of its deepest parent, which is enough to
 * read a pipeline left to right without pulling in a layout library. Nodes in a
 * cycle keep the depth they were first given rather than looping forever.
 */
const layout = (nodes: GraphNode[], edges: GraphEdge[]) => {
    const parents = new Map<string, string[]>()
    for (const edge of edges) {
        parents.set(edge.to, [...(parents.get(edge.to) ?? []), edge.from])
    }

    const depths = new Map<string, number>()

    const depthOf = (id: string, seen: Set<string>): number => {
        if (depths.has(id)) return depths.get(id) as number
        if (seen.has(id)) return 0

        seen.add(id)
        const incoming = parents.get(id) ?? []
        const depth = incoming.length
            ? Math.max(...incoming.map((parent) => depthOf(parent, seen))) + 1
            : 0

        depths.set(id, depth)
        return depth
    }

    for (const node of nodes) depthOf(node.id, new Set())

    const columns = new Map<number, GraphNode[]>()
    for (const node of nodes) {
        const depth = depths.get(node.id) ?? 0
        columns.set(depth, [...(columns.get(depth) ?? []), node])
    }

    const COLUMN_WIDTH = 150
    const ROW_HEIGHT = 56
    const BOX_WIDTH = 116
    const BOX_HEIGHT = 32

    const positions = new Map<string, { x: number; y: number }>()
    let tallest = 0

    for (const [depth, columnNodes] of columns) {
        tallest = Math.max(tallest, columnNodes.length)
        columnNodes.forEach((node, index) => {
            positions.set(node.id, {
                x: depth * COLUMN_WIDTH + 12,
                y: index * ROW_HEIGHT + 12
            })
        })
    }

    return {
        positions,
        width: columns.size * COLUMN_WIDTH + 12,
        height: tallest * ROW_HEIGHT + 12,
        boxWidth: BOX_WIDTH,
        boxHeight: BOX_HEIGHT
    }
}

const GraphView = ({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) => {
    const { positions, width, height, boxWidth, boxHeight } = layout(nodes, edges)

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-auto w-full"
            style={{ maxHeight: 320 }}
            role="img"
            aria-label={`Graph of ${nodes.length} nodes`}
        >
            <title>{`${nodes.length} nodes, ${edges.length} connections`}</title>
            {edges.map((edge) => {
                const from = positions.get(edge.from)
                const to = positions.get(edge.to)
                if (!from || !to) return null

                const x1 = from.x + boxWidth
                const y1 = from.y + boxHeight / 2
                const x2 = to.x
                const y2 = to.y + boxHeight / 2
                const mid = (x1 + x2) / 2

                return (
                    <path
                        key={`${edge.from}-${edge.to}-${edge.label ?? ""}`}
                        d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                        className="fill-none stroke-muted-foreground/40"
                        strokeWidth={1.5}
                    />
                )
            })}
            {nodes.map((node) => {
                const at = positions.get(node.id)
                if (!at) return null

                return (
                    <g key={node.id}>
                        <rect
                            x={at.x}
                            y={at.y}
                            width={boxWidth}
                            height={boxHeight}
                            rx={6}
                            className="fill-background stroke-border"
                            strokeWidth={1}
                        />
                        <text
                            x={at.x + boxWidth / 2}
                            y={at.y + boxHeight / 2 + 4}
                            textAnchor="middle"
                            className="fill-foreground"
                            style={{ fontSize: 11 }}
                        >
                            {(node.label ?? node.id).slice(0, 16)}
                        </text>
                    </g>
                )
            })}
        </svg>
    )
}

const TableView = ({
    columns,
    rows
}: {
    columns: string[]
    rows: Record<string, unknown>[]
}) => (
    <div className="overflow-auto" style={{ maxHeight: 320 }}>
        <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-muted">
                <tr>
                    {columns.map((column) => (
                        <th key={column} className="border-b p-2 text-left font-medium">
                            {column}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.slice(0, 200).map((row, index) => (
                    // Rows have no natural key, and the list is not reordered.
                    // biome-ignore lint/suspicious/noArrayIndexKey: no stable id
                    <tr key={index} className="odd:bg-muted/30">
                        {columns.map((column) => {
                            const cell = row[column]
                            return (
                                <td key={column} className="border-b p-2 align-top">
                                    {cell === null || cell === undefined
                                        ? ""
                                        : typeof cell === "object"
                                            ? JSON.stringify(cell)
                                            : String(cell)}
                                </td>
                            )
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
        {rows.length > 200 && (
            <p className="p-2 text-muted-foreground text-xs">
                Showing 200 of {rows.length} rows
            </p>
        )}
    </div>
)

/**
 * Renders one typed value.
 *
 * Shared by the canvas node and the executions page, so a run looks the same
 * while it happens and afterwards.
 */
export const DisplayValue = ({ value }: { value: TypedValue }) => {
    switch (value.kind) {
        case "image":
            return (
                // Sources are arbitrary remote URLs produced at run time, which
                // the image optimiser cannot be configured for ahead of time.
                // biome-ignore lint/performance/noImgElement: run-time URLs
                <img
                    src={value.url}
                    alt={value.alt ?? ""}
                    className="h-auto max-h-80 w-full rounded-md object-contain"
                />
            )

        case "video":
            return (
                // biome-ignore lint/a11y/useMediaCaption: captions are not available for generated media
                <video
                    src={value.url}
                    poster={value.poster}
                    controls
                    className="max-h-80 w-full rounded-md"
                />
            )

        case "audio":
            return (
                // biome-ignore lint/a11y/useMediaCaption: captions are not available for generated media
                <audio src={value.url} controls className="w-full" />
            )

        case "table":
            return <TableView columns={value.columns} rows={value.rows} />

        case "graph":
            return <GraphView nodes={value.nodes} edges={value.edges} />

        case "markdown":
        case "text":
            return (
                <p className="whitespace-pre-wrap break-words text-sm">
                    {value.text}
                </p>
            )

        default:
            return (
                <pre className="overflow-auto rounded-md bg-muted p-2 text-xs" style={{ maxHeight: 320 }}>
                    {JSON.stringify(value.value, null, 2)}
                </pre>
            )
    }
}

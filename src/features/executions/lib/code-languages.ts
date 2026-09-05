export const CODE_LANGUAGES = [
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "r", label: "R" }
] as const

export type CodeLanguage = (typeof CODE_LANGUAGES)[number]["value"]

/** Starter code per language, each showing how data arrives and leaves. */
export const CODE_SAMPLES: Record<CodeLanguage, string> = {
    javascript: `// input holds every variable from earlier nodes
const rows = input.myQuery?.rows ?? [];

return rows
  .filter(row => row.total > 100)
  .map(row => ({ id: row.id, total: row.total }));`,

    typescript: `// Types are checked as you write, then erased before running
type Row = { id: number; total: number };

const rows: Row[] = input.myQuery?.rows ?? [];

return rows
  .filter(row => row.total > 100)
  .map(row => ({ id: row.id, total: row.total }));`,

    python: `# input holds every variable from earlier nodes
rows = input.get("myQuery", {}).get("rows", [])

return [
    {"id": row["id"], "total": row["total"]}
    for row in rows
    if row["total"] > 100
]`,

    r: `# input holds every variable from earlier nodes
rows <- input$myQuery$rows

total <- sum(unlist(lapply(rows, function(row) row$total)))

list(total = total, count = length(rows))`
}

/** What the editor highlights, which is not always the language's own name. */
export const EDITOR_LANGUAGE: Record<CodeLanguage, "javascript" | "python" | "r"> = {
    javascript: "javascript",
    typescript: "javascript",
    python: "python",
    r: "r"
}

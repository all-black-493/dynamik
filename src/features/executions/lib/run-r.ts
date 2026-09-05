import "server-only"

import { SandboxError } from "./sandbox-error"

/**
 * Runs R through WebR, which is R compiled to WebAssembly.
 *
 * Base R ships no JSON parser and WebR's own object binding did not survive a
 * round trip in testing, so data crosses in a way that needs neither: the input
 * is emitted as R literal syntax, and the result is serialised by a small
 * function written in base R and injected ahead of the user's code.
 *
 * That avoids installing jsonlite, which WebR would have to fetch over the
 * network on every cold start.
 */

type WebRInstance = {
    init: () => Promise<void>
    evalRString: (code: string) => Promise<string>
    close: () => Promise<void>
}

let webRPromise: Promise<WebRInstance> | null = null

const getWebR = async (): Promise<WebRInstance> => {
    if (!webRPromise) {
        webRPromise = import("webr").then(async (module) => {
            const instance = new module.WebR() as unknown as WebRInstance
            await instance.init()
            return instance
        })
    }

    return webRPromise
}

/** Emits a JS value as R literal syntax, so no parser is needed on the R side. */
const toRLiteral = (value: unknown): string => {
    if (value === null || value === undefined) return "NULL"

    if (typeof value === "boolean") return value ? "TRUE" : "FALSE"

    if (typeof value === "number") {
        return Number.isFinite(value) ? String(value) : "NA"
    }

    if (typeof value === "string") {
        // R string literals, with backslashes and quotes escaped.
        return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`
    }

    if (Array.isArray(value)) {
        return `list(${value.map(toRLiteral).join(", ")})`
    }

    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            // Names that are not syntactic have to be quoted.
            .map(([key, nested]) => `\`${key.replace(/`/g, "")}\` = ${toRLiteral(nested)}`)

        return `list(${entries.join(", ")})`
    }

    return "NULL"
}

/** A JSON writer in base R, so no package has to be fetched. */
const R_JSON_WRITER = `
.esc <- function(s) {
  s <- gsub("\\\\\\\\", "\\\\\\\\\\\\\\\\", s)
  s <- gsub('"', '\\\\\\\\"', s)
  s <- gsub("\\n", "\\\\\\\\n", s)
  s
}
.tojson <- function(x) {
  if (is.null(x)) return("null")
  if (is.list(x)) {
    nms <- names(x)
    if (is.null(nms) || any(nms == "")) {
      return(paste0("[", paste(sapply(x, .tojson), collapse = ","), "]"))
    }
    parts <- sapply(seq_along(x), function(i)
      paste0('"', .esc(nms[i]), '":', .tojson(x[[i]])))
    return(paste0("{", paste(parts, collapse = ","), "}"))
  }
  if (length(x) > 1) {
    return(paste0("[", paste(sapply(x, .tojson), collapse = ","), "]"))
  }
  if (is.logical(x)) return(if (is.na(x)) "null" else if (x) "true" else "false")
  if (is.numeric(x)) return(if (is.na(x)) "null" else as.character(x))
  paste0('"', .esc(as.character(x)), '"')
}
`

export const runR = async ({
    code,
    input,
    timeoutMs
}: {
    code: string
    input: unknown
    timeoutMs: number
}): Promise<{ value: unknown; logs: string[] }> => {
    const webR = await getWebR()

    const program = `
${R_JSON_WRITER}
input <- ${toRLiteral(input)}
.run <- function(input) {
${code}
}
.tojson(.run(input))
`

    let timer: ReturnType<typeof setTimeout> | undefined

    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
            () => reject(new SandboxError(`Code ran longer than ${timeoutMs}ms and was stopped`)),
            timeoutMs
        )
    })

    try {
        const serialised = await Promise.race([webR.evalRString(program), timeout])

        return { value: JSON.parse(serialised), logs: [] }

    } catch (error) {
        if (error instanceof SandboxError) throw error

        const message = (error as Error).message ?? "Code failed"
        throw new SandboxError(message.replace(/^T:\s*/, "").trim() || "Code failed")

    } finally {
        if (timer) clearTimeout(timer)
    }
}

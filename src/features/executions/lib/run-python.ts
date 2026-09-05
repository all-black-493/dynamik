import "server-only"

import { SandboxError } from "./sandbox-error"

/**
 * Runs Python through Pyodide, which is CPython compiled to WebAssembly.
 *
 * Same isolation argument as the JavaScript runner: a separate interpreter with
 * its own heap, no filesystem worth reaching and no route back to the host
 * process. Data crosses as JSON, so nothing holds a reference across the
 * boundary.
 *
 * Loading the interpreter costs roughly two seconds, so the instance is kept
 * between calls within a warm process. It is loaded lazily, which matters
 * because most workflows never contain a Python node and should not pay for
 * one.
 */

type PyodideInstance = {
    runPythonAsync: (code: string) => Promise<unknown>
    setStdout: (options: { batched: (text: string) => void }) => void
    setStderr: (options: { batched: (text: string) => void }) => void
}

let pyodidePromise: Promise<PyodideInstance> | null = null

const getPyodide = async (): Promise<PyodideInstance> => {
    if (!pyodidePromise) {
        pyodidePromise = import("pyodide").then((module) =>
            module.loadPyodide() as unknown as Promise<PyodideInstance>
        )
    }

    return pyodidePromise
}

/** Indents a body so it sits inside a function, giving Python a usable return. */
const indent = (code: string) =>
    code
        .split("\n")
        .map((line) => (line.trim() ? `    ${line}` : line))
        .join("\n")

export const runPython = async ({
    code,
    input,
    timeoutMs
}: {
    code: string
    input: unknown
    timeoutMs: number
}): Promise<{ value: unknown; logs: string[] }> => {
    const pyodide = await getPyodide()

    const logs: string[] = []
    pyodide.setStdout({ batched: (text) => logs.push(text) })
    pyodide.setStderr({ batched: (text) => logs.push(text) })

    // The user's code becomes a function body so `return` behaves as it does in
    // the other languages, rather than Python's module-level rules.
    const program = `
import json as _json

_input = _json.loads(${JSON.stringify(JSON.stringify(input ?? null))})

def _run(input):
${indent(code) || "    pass"}

_json.dumps(_run(_input), default=str)
`

    // Pyodide has no interrupt that works without a shared buffer here, so the
    // ceiling is a race. A tight loop in Python will still finish the request
    // eventually; the timeout stops the workflow waiting on it.
    const execution = pyodide.runPythonAsync(program)

    let timer: ReturnType<typeof setTimeout> | undefined

    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
            () => reject(new SandboxError(`Code ran longer than ${timeoutMs}ms and was stopped`)),
            timeoutMs
        )
    })

    try {
        const serialised = await Promise.race([execution, timeout])

        if (typeof serialised !== "string") {
            throw new SandboxError("Code returned something that cannot be sent onwards")
        }

        return { value: JSON.parse(serialised), logs }

    } catch (error) {
        if (error instanceof SandboxError) throw error

        // Pyodide puts the Python traceback in the message; the last line names
        // the actual error, which is the part worth showing.
        const message = (error as Error).message ?? "Code failed"
        const lastLine = message.trim().split("\n").pop() ?? message

        throw new SandboxError(lastLine)

    } finally {
        if (timer) clearTimeout(timer)
    }
}

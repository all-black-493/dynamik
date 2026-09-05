import "server-only"

import type { CodeLanguage } from "./code-languages"
import { SandboxError } from "./sandbox-error"
import { runPython } from "./run-python"
import { runR } from "./run-r"
import { runSandboxed } from "./run-sandboxed"

export { SandboxError }

const DEFAULT_TIMEOUT_MS = 5_000
const MAX_TIMEOUT_MS = 30_000

/** Erases types so the JavaScript engine can run TypeScript unchanged. */
const transpileTypeScript = async (code: string): Promise<string> => {
    const ts = await import("typescript")

    const output = ts.transpileModule(code, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.None,
            // Types are erased rather than checked here. The editor reports type
            // errors while writing; refusing to run over them would make a
            // loosely typed workflow value impossible to use.
            isolatedModules: true
        },
        reportDiagnostics: true
    })

    const fatal = output.diagnostics?.find(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
    )

    if (fatal) {
        throw new SandboxError(
            `TypeScript: ${ts.flattenDiagnosticMessageText(fatal.messageText, " ")}`
        )
    }

    return output.outputText
}

/**
 * Runs user code in whichever engine the node selected.
 *
 * Every language is a WebAssembly build with its own heap and no host bindings,
 * and every one exchanges data as JSON, so the contract a node author sees is
 * identical: read `input`, return a value.
 */
export const runCode = async ({
    language,
    code,
    input,
    timeoutMs
}: {
    language: CodeLanguage
    code: string
    input: unknown
    timeoutMs?: number
}): Promise<{ value: unknown; logs: string[] }> => {
    const limit = Math.min(Math.max(timeoutMs || DEFAULT_TIMEOUT_MS, 100), MAX_TIMEOUT_MS)

    switch (language) {
        case "typescript":
            return runSandboxed({
                code: await transpileTypeScript(code),
                input,
                timeoutMs: limit
            })

        case "python":
            return runPython({ code, input, timeoutMs: limit })

        case "r":
            return runR({ code, input, timeoutMs: limit })

        default:
            return runSandboxed({ code, input, timeoutMs: limit })
    }
}

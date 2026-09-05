import "server-only"

import { getQuickJS } from "quickjs-emscripten"

/**
 * Runs user JavaScript in a real isolate.
 *
 * Node's own `vm` module is explicitly not a security boundary, and escaping it
 * through `this.constructor.constructor("return process")()` is a one-liner. On
 * a multi-tenant deployment that is the difference between a Code node and
 * handing every customer the server's environment, including ENCRYPTION_KEY.
 *
 * QuickJS compiled to WebAssembly is a separate engine with its own heap and no
 * host bindings at all: there is no `process`, no `require`, no `fetch`, and
 * nothing to reach them through. It also needs no native module, so it runs on
 * serverless where `isolated-vm` would not.
 *
 * Data crosses the boundary as JSON, so the sandbox never holds a reference to
 * a host object.
 */

/** Wall-clock ceiling. The interrupt handler stops loops that never yield. */
const DEFAULT_TIMEOUT_MS = 5_000
const MAX_TIMEOUT_MS = 30_000
const MEMORY_LIMIT_BYTES = 64 * 1024 * 1024
const MAX_OUTPUT_BYTES = 1024 * 1024

export class SandboxError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "SandboxError"
    }
}

export type SandboxResult = {
    value: unknown
    logs: string[]
}

export const runSandboxed = async ({
    code,
    input,
    timeoutMs = DEFAULT_TIMEOUT_MS
}: {
    code: string
    input: unknown
    timeoutMs?: number
}): Promise<SandboxResult> => {
    const limit = Math.min(Math.max(timeoutMs, 100), MAX_TIMEOUT_MS)

    const serialisedInput = JSON.stringify(input ?? null)

    if (serialisedInput === undefined) {
        throw new SandboxError("Workflow data could not be passed to the sandbox")
    }

    const QuickJS = await getQuickJS()
    const runtime = QuickJS.newRuntime()

    runtime.setMemoryLimit(MEMORY_LIMIT_BYTES)

    const deadline = Date.now() + limit
    runtime.setInterruptHandler(() => Date.now() > deadline)

    const vm = runtime.newContext()

    try {
        // console.log is the only host function exposed, and it only collects
        // strings for the execution record.
        const logs: string[] = []

        const consoleHandle = vm.newObject()
        const logHandle = vm.newFunction("log", (...args) => {
            logs.push(
                args
                    .map((arg) => {
                        const dumped = vm.dump(arg)
                        return typeof dumped === "string" ? dumped : JSON.stringify(dumped)
                    })
                    .join(" ")
            )
        })
        vm.setProp(consoleHandle, "log", logHandle)
        vm.setProp(vm.global, "console", consoleHandle)
        logHandle.dispose()
        consoleHandle.dispose()

        // The user writes a body, not a module, so it is wrapped in a function
        // that receives the data and returns a value. Returning nothing is
        // allowed and yields null rather than an error.
        const wrapped = `
            (function () {
                const $input = ${serialisedInput};
                const $run = function (input) {
${code}
                };
                const $result = $run($input);
                return JSON.stringify($result === undefined ? null : $result);
            })()
        `

        const evaluated = vm.evalCode(wrapped)

        if (evaluated.error) {
            const detail = vm.dump(evaluated.error) as { message?: string; name?: string }
            evaluated.error.dispose()

            // An interrupt arrives here as "InternalError: interrupted", which
            // says nothing useful. It is a timeout, so report it as one.
            if (Date.now() > deadline || detail?.message === "interrupted") {
                throw new SandboxError(`Code ran longer than ${limit}ms and was stopped`)
            }

            throw new SandboxError(
                detail?.message
                    ? `${detail.name ?? "Error"}: ${detail.message}`
                    : "Code failed"
            )
        }

        const serialised = vm.dump(evaluated.value) as string
        evaluated.value.dispose()

        if (typeof serialised !== "string") {
            throw new SandboxError("Code returned something that cannot be sent onwards")
        }

        if (serialised.length > MAX_OUTPUT_BYTES) {
            throw new SandboxError(
                `Code returned ${Math.round(serialised.length / 1024)}KB, over the 1MB limit`
            )
        }

        return { value: JSON.parse(serialised), logs }

    } catch (error) {
        if (error instanceof SandboxError) throw error

        // An interrupt surfaces as a generic failure, so name it usefully.
        if (Date.now() > deadline) {
            throw new SandboxError(`Code ran longer than ${limit}ms and was stopped`)
        }

        throw new SandboxError((error as Error).message || "Code failed")

    } finally {
        vm.dispose()
        runtime.dispose()
    }
}

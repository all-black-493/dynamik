import type { StepTools } from "./types"

/**
 * Namespaces a node's step ids.
 *
 * Inngest identifies a step by its id and memoizes the result, so running the
 * same node twice in one execution would collide: the second call would be
 * handed the first call's cached result instead of doing the work. Every
 * executor hardcodes its step ids ("telegram-webhook", "get-credential"), which
 * is fine while each node runs once and breaks the moment a loop body repeats.
 *
 * Rather than rewriting every executor to thread an id through, the step tools
 * handed to a repeated node are wrapped so "telegram-webhook" becomes
 * "loop-3-item-0:telegram-webhook". Each iteration therefore gets its own
 * durable, separately retried steps, and executors stay unaware of looping.
 */
export const scopeStep = (step: StepTools, prefix: string): StepTools => {
    const scopedRun = (id: string, ...rest: unknown[]) =>
        (step.run as unknown as (id: string, ...args: unknown[]) => unknown)(
            `${prefix}:${id}`,
            ...rest
        )

    const scopedAiWrap = (id: string, ...rest: unknown[]) =>
        (step.ai.wrap as unknown as (id: string, ...args: unknown[]) => unknown)(
            `${prefix}:${id}`,
            ...rest
        )

    return Object.assign(Object.create(step) as StepTools, {
        run: scopedRun,
        ai: Object.assign(Object.create(step.ai) as StepTools["ai"], {
            wrap: scopedAiWrap
        })
    }) as StepTools
}

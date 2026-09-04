import {
    type Combinator,
    type Condition,
    ConditionError,
    evaluateConditions
} from "@/features/executions/lib/conditions";
import { resolveConditions } from "@/features/executions/lib/resolve-conditions";
import { branch, type NodeExecutor } from "@/features/executions/lib/types";
import { switchChannel } from "@/inngest/channels/switch";
import { NonRetriableError } from "inngest";

export const SWITCH_FALLBACK_OUTPUT = "fallback"

export type SwitchRule = {
    /**
     * Stable across edits. Edges store this as their fromOutput, so it must not
     * be the rule's position: reordering rules would silently rewire the canvas.
     */
    id: string;
    name?: string;
    combinator?: Combinator;
    conditions: Condition[];
}

type switchData = {
    variableName?: string;
    rules?: SwitchRule[];
    /** Take every matching rule rather than stopping at the first. */
    matchAll?: boolean;
    /** Send non-matching runs to the fallback output instead of stopping. */
    useFallback?: boolean;
}

export const switchExecutor: NodeExecutor<switchData> = async ({
    data,
    nodeId,
    context,
    publish
}) => {

    await publish(switchChannel().status({ nodeId, status: "loading" }))

    const rules = data.rules ?? []

    try {
        const matched: string[] = []

        for (const rule of rules) {
            const passes = evaluateConditions(
                resolveConditions(rule.conditions ?? [], context),
                rule.combinator ?? "AND"
            )

            if (passes) {
                matched.push(rule.id)
                if (!data.matchAll) break
            }
        }

        const outputs = matched.length
            ? matched
            : data.useFallback
                ? [SWITCH_FALLBACK_OUTPUT]
                : []

        await publish(switchChannel().status({ nodeId, status: "success" }))

        const nextContext = data.variableName
            ? {
                ...context,
                [data.variableName]: {
                    matched,
                    // Names are for reading in a later node; ids are what the
                    // edges use.
                    matchedNames: rules
                        .filter((rule) => matched.includes(rule.id))
                        .map((rule) => rule.name ?? rule.id),
                    usedFallback: matched.length === 0 && Boolean(data.useFallback)
                }
            }
            : context

        return branch(nextContext, outputs)

    } catch (error) {
        await publish(switchChannel().status({ nodeId, status: "error" }))

        if (error instanceof ConditionError) {
            throw new NonRetriableError(`Switch node: ${error.message}`)
        }

        throw error
    }
}

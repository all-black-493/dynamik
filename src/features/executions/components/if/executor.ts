import { branch, type NodeExecutor } from "@/features/executions/lib/types";
import {
    type Combinator,
    type Condition,
    ConditionError,
    evaluateConditions
} from "@/features/executions/lib/conditions";
import { resolveConditions } from "@/features/executions/lib/resolve-conditions";
import { ifChannel } from "@/inngest/channels/if";
import { NonRetriableError } from "inngest";

export const IF_OUTPUT_TRUE = "true"
export const IF_OUTPUT_FALSE = "false"

type ifData = {
    variableName?: string;
    combinator?: Combinator;
    conditions?: Condition[];
}

export const ifExecutor: NodeExecutor<ifData> = async ({
    data,
    nodeId,
    context,
    publish
}) => {

    await publish(ifChannel().status({ nodeId, status: "loading" }))

    const conditions = data.conditions ?? []
    const combinator = data.combinator ?? "AND"

    try {
        const matched = evaluateConditions(
            resolveConditions(conditions, context),
            combinator
        )

        await publish(ifChannel().status({ nodeId, status: "success" }))

        const nextContext = data.variableName
            ? { ...context, [data.variableName]: { matched } }
            : context

        return branch(nextContext, [matched ? IF_OUTPUT_TRUE : IF_OUTPUT_FALSE])

    } catch (error) {
        await publish(ifChannel().status({ nodeId, status: "error" }))

        // A condition that cannot be evaluated is a configuration mistake, not
        // a transient fault, so retrying it would only waste the budget.
        if (error instanceof ConditionError) {
            throw new NonRetriableError(`If node: ${error.message}`)
        }

        throw error
    }
}

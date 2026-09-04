import {
    type Combinator,
    type Condition,
    ConditionError,
    evaluateConditions
} from "@/features/executions/lib/conditions";
import { resolveConditions } from "@/features/executions/lib/resolve-conditions";
import { branch, DEFAULT_OUTPUT, type NodeExecutor } from "@/features/executions/lib/types";
import { filterChannel } from "@/inngest/channels/filter";
import { NonRetriableError } from "inngest";

type filterData = {
    variableName?: string;
    combinator?: Combinator;
    conditions?: Condition[];
}

/**
 * Stops a path when its conditions do not hold.
 *
 * An If node with nothing wired to its false output would do the same thing,
 * but says the opposite of what is meant. Filter has one output and simply
 * activates nothing when it does not pass, which reads as "go no further".
 */
export const filterExecutor: NodeExecutor<filterData> = async ({
    data,
    nodeId,
    context,
    publish
}) => {

    await publish(filterChannel().status({ nodeId, status: "loading" }))

    try {
        const passed = evaluateConditions(
            resolveConditions(data.conditions ?? [], context),
            data.combinator ?? "AND"
        )

        await publish(filterChannel().status({ nodeId, status: "success" }))

        const nextContext = data.variableName
            ? { ...context, [data.variableName]: { passed } }
            : context

        return branch(nextContext, passed ? [DEFAULT_OUTPUT] : [])

    } catch (error) {
        await publish(filterChannel().status({ nodeId, status: "error" }))

        if (error instanceof ConditionError) {
            throw new NonRetriableError(`Filter node: ${error.message}`)
        }

        throw error
    }
}

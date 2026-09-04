import { branch, type NodeExecutor } from "@/features/executions/lib/types";
import {
    type Combinator,
    type Condition,
    ConditionError,
    evaluateConditions,
    type ResolvedCondition,
    UNARY_OPERATORS
} from "@/features/executions/lib/conditions";
import { ifChannel } from "@/inngest/channels/if";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

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
        const render = (template: string | undefined) =>
            template ? decode(Handlebars.compile(template)(context)) : ""

        const resolved: ResolvedCondition[] = conditions.map((condition) => ({
            ...condition,
            left: render(condition.left),
            // A unary operator ignores the right side, so it is not rendered and
            // cannot fail on a template referring to something that is not there.
            right: UNARY_OPERATORS.has(condition.operator) ? "" : render(condition.right)
        }))

        const matched = evaluateConditions(resolved, combinator)

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

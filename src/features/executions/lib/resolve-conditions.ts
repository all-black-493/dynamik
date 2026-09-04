import Handlebars from "handlebars"
import { decode } from "html-entities"
import type { Condition, ResolvedCondition } from "./conditions"
import { UNARY_OPERATORS } from "./conditions"
import type { WorkflowContext } from "./types"

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

/**
 * Renders a condition's templates against the workflow context.
 *
 * Kept apart from conditions.ts so the evaluation rules stay free of
 * Handlebars, and shared by If, Switch and Filter so the three cannot drift on
 * something as easy to get subtly wrong as when the right side is rendered.
 */
export const resolveConditions = (
    conditions: Condition[],
    context: WorkflowContext
): ResolvedCondition[] => {
    const render = (template: string | undefined) =>
        template ? decode(Handlebars.compile(template)(context)) : ""

    return conditions.map((condition) => ({
        ...condition,
        left: render(condition.left),
        // A unary operator ignores the right side, so it is never rendered and
        // cannot fail on a template pointing at something that is not there.
        right: UNARY_OPERATORS.has(condition.operator) ? "" : render(condition.right)
    }))
}

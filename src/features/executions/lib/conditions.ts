/**
 * Condition evaluation shared by every branching node.
 *
 * Deliberately strict. The common failure with condition builders is silent
 * coercion: comparing a value that is not a number against a number yields
 * false rather than an error, so a workflow takes the wrong branch and looks
 * like it worked. Here a value that cannot be read as the declared type raises
 * ConditionError, naming the side and the value, and the node fails loudly.
 *
 * Kept free of Handlebars and Inngest so the Switch and Filter nodes can reuse
 * it, and so it can be exercised on its own.
 */

export type ConditionType = "string" | "number" | "boolean"

export const STRING_OPERATORS = [
    "equals",
    "notEquals",
    "contains",
    "notContains",
    "startsWith",
    "endsWith",
    "matchesRegex",
    "isEmpty",
    "isNotEmpty"
] as const

export const NUMBER_OPERATORS = [
    "equals",
    "notEquals",
    "greaterThan",
    "greaterThanOrEqual",
    "lessThan",
    "lessThanOrEqual"
] as const

export const BOOLEAN_OPERATORS = ["isTrue", "isFalse"] as const

export const OPERATORS_BY_TYPE: Record<ConditionType, readonly string[]> = {
    string: STRING_OPERATORS,
    number: NUMBER_OPERATORS,
    boolean: BOOLEAN_OPERATORS
}

/** Operators that read only the left side, so the form hides the right input. */
export const UNARY_OPERATORS = new Set([
    "isEmpty",
    "isNotEmpty",
    "isTrue",
    "isFalse"
])

export const OPERATOR_LABELS: Record<string, string> = {
    equals: "equals",
    notEquals: "does not equal",
    contains: "contains",
    notContains: "does not contain",
    startsWith: "starts with",
    endsWith: "ends with",
    matchesRegex: "matches regex",
    isEmpty: "is empty",
    isNotEmpty: "is not empty",
    greaterThan: "is greater than",
    greaterThanOrEqual: "is greater than or equal to",
    lessThan: "is less than",
    lessThanOrEqual: "is less than or equal to",
    isTrue: "is true",
    isFalse: "is false"
}

export type Condition = {
    /** Template, resolved before evaluation. */
    left: string
    operator: string
    /** Template. Ignored by unary operators. */
    right?: string
    type: ConditionType
    /** String comparisons only. Defaults to true. */
    caseSensitive?: boolean
}

/** A condition whose templates have already been rendered. */
export type ResolvedCondition = Omit<Condition, "left" | "right"> & {
    left: string
    right: string
}

export type Combinator = "AND" | "OR"

export class ConditionError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "ConditionError"
    }
}

const TRUTHY = new Set(["true", "1", "yes", "y", "on"])
const FALSY = new Set(["false", "0", "no", "n", "off"])

const toNumber = (raw: string, side: "Left" | "Right"): number => {
    const trimmed = raw.trim()

    if (!trimmed) {
        throw new ConditionError(`${side} value is empty, but the condition compares numbers`)
    }

    const parsed = Number(trimmed)

    if (!Number.isFinite(parsed)) {
        throw new ConditionError(`${side} value "${trimmed}" is not a number`)
    }

    return parsed
}

const toBoolean = (raw: string, side: "Left" | "Right"): boolean => {
    const normalized = raw.trim().toLowerCase()

    if (TRUTHY.has(normalized)) return true
    if (FALSY.has(normalized)) return false

    throw new ConditionError(
        `${side} value "${raw.trim()}" is not a boolean. Use true or false.`
    )
}

const applyCase = (value: string, caseSensitive: boolean) =>
    caseSensitive ? value : value.toLowerCase()

export const evaluateCondition = (condition: ResolvedCondition): boolean => {
    const { operator, type } = condition
    const allowed = OPERATORS_BY_TYPE[type]

    if (!allowed) {
        throw new ConditionError(`Unknown condition type "${type}"`)
    }

    if (!allowed.includes(operator)) {
        throw new ConditionError(
            `Operator "${operator}" is not valid for a ${type} condition`
        )
    }

    if (type === "boolean") {
        const left = toBoolean(condition.left, "Left")
        return operator === "isTrue" ? left : !left
    }

    if (type === "number") {
        const left = toNumber(condition.left, "Left")
        const right = toNumber(condition.right, "Right")

        switch (operator) {
            case "equals": return left === right
            case "notEquals": return left !== right
            case "greaterThan": return left > right
            case "greaterThanOrEqual": return left >= right
            case "lessThan": return left < right
            case "lessThanOrEqual": return left <= right
        }
    }

    // Empty is defined as "nothing but whitespace", so a template that resolved
    // to nothing and a genuinely blank value are treated the same.
    if (operator === "isEmpty") return condition.left.trim() === ""
    if (operator === "isNotEmpty") return condition.left.trim() !== ""

    const caseSensitive = condition.caseSensitive ?? true
    const left = applyCase(condition.left, caseSensitive)
    const right = applyCase(condition.right, caseSensitive)

    switch (operator) {
        case "equals": return left === right
        case "notEquals": return left !== right
        case "contains": return left.includes(right)
        case "notContains": return !left.includes(right)
        case "startsWith": return left.startsWith(right)
        case "endsWith": return left.endsWith(right)
        case "matchesRegex": {
            if (!condition.right.trim()) {
                throw new ConditionError("Regex pattern is empty")
            }

            try {
                return new RegExp(condition.right, caseSensitive ? "" : "i")
                    .test(condition.left)
            } catch (error) {
                throw new ConditionError(
                    `Invalid regex "${condition.right}": ${(error as Error).message}`
                )
            }
        }
    }

    throw new ConditionError(`Unhandled operator "${operator}"`)
}

/**
 * Combines conditions. An empty list is true, so a branch node with nothing
 * configured passes rather than silently sending every run down the false path.
 */
export const evaluateConditions = (
    conditions: ResolvedCondition[],
    combinator: Combinator
): boolean => {
    if (conditions.length === 0) return true

    return combinator === "OR"
        ? conditions.some(evaluateCondition)
        : conditions.every(evaluateCondition)
}

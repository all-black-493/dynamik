import type { Realtime } from "@inngest/realtime";
import type { GetStepTools, Inngest } from "inngest"

export type WorkflowContext = Record<string, unknown>
export type StepTools = GetStepTools<Inngest.Any>
export interface NodeExecutorParams<TData = Record<string, unknown>> {
    data: TData;
    nodeId: string;
    userId: string;
    context: WorkflowContext;
    step: StepTools;
    publish: Realtime.PublishFn
}

/** The output every non-branching node and connection uses. */
export const DEFAULT_OUTPUT = "main"

/**
 * Marks a branching result.
 *
 * A symbol rather than a string key because the alternative return value is the
 * workflow context, whose keys are chosen by the user: a node named "context"
 * or "outputs" would otherwise be mistaken for a branch result.
 */
const OUTCOME = Symbol.for("dynamik.node-outcome")

export type NodeOutcome = {
    [OUTCOME]: true
    context: WorkflowContext
    /** Names of the outputs to follow. Downstream nodes on other outputs are skipped. */
    outputs: string[]
}

/**
 * Returned by a node that decides where the run goes next.
 *
 * Nodes that simply do work keep returning the context on its own and are
 * treated as taking the single default output.
 */
export const branch = (
    context: WorkflowContext,
    outputs: string[]
): NodeOutcome => ({
    [OUTCOME]: true,
    context,
    outputs
})

export const isNodeOutcome = (value: unknown): value is NodeOutcome =>
    typeof value === "object" && value !== null && OUTCOME in value

export const toOutcome = (
    result: WorkflowContext | NodeOutcome
): { context: WorkflowContext; outputs: string[] } =>
    isNodeOutcome(result)
        ? { context: result.context, outputs: result.outputs }
        : { context: result, outputs: [DEFAULT_OUTPUT] }

export type NodeExecutor<TData = Record<string, unknown>> = (
    params: NodeExecutorParams<TData>
) => Promise<WorkflowContext | NodeOutcome>

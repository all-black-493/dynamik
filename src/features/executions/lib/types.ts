import type { Realtime } from "@inngest/realtime";
import type { GetStepTools, Inngest } from "inngest"
import { DEFAULT_OUTPUT } from "./outputs"

export type WorkflowContext = Record<string, unknown>

/**
 * A node attached to another node rather than placed in the flow.
 *
 * Attachments are configuration: a model, a tool. They never execute, and the
 * engine hands them to their parent instead of running them.
 */
export type AttachedNode = {
    id: string
    type: string
    name: string
    data: Record<string, unknown>
}
export type StepTools = GetStepTools<Inngest.Any>
export interface NodeExecutorParams<TData = Record<string, unknown>> {
    data: TData;
    nodeId: string;
    userId: string;
    context: WorkflowContext;
    step: StepTools;
    publish: Realtime.PublishFn;
    /** Nodes docked to this one. Empty for every node that takes none. */
    children: AttachedNode[]
}

export { DEFAULT_OUTPUT } from "./outputs"

/**
 * Marks a branching result.
 *
 * A symbol rather than a string key because the alternative return value is the
 * workflow context, whose keys are chosen by the user: a node named "context"
 * or "outputs" would otherwise be mistaken for a branch result.
 */
const OUTCOME = Symbol.for("dynamik.node-outcome")

/**
 * Asks the engine to run one output's downstream nodes once per item.
 *
 * A node cannot do this itself: it has no view of the graph and no way to
 * invoke other executors. So it describes the iteration and the engine carries
 * it out.
 */
export type NodeLoop = {
    /** The output whose downstream nodes form the body. */
    output: string
    items: unknown[]
    /** Context key holding the current item during each pass. */
    as: string
}

export type NodeOutcome = {
    [OUTCOME]: true
    context: WorkflowContext
    /** Names of the outputs to follow. Downstream nodes on other outputs are skipped. */
    outputs: string[]
    loop?: NodeLoop
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

/**
 * Returned by a node that iterates. The body output is driven by the engine
 * rather than activated normally, so it is not listed in `outputs`.
 */
export const loopOver = (
    context: WorkflowContext,
    loop: NodeLoop,
    outputs: string[]
): NodeOutcome => ({
    [OUTCOME]: true,
    context,
    outputs,
    loop
})

export const isNodeOutcome = (value: unknown): value is NodeOutcome =>
    typeof value === "object" && value !== null && OUTCOME in value

export const toOutcome = (
    result: WorkflowContext | NodeOutcome
): { context: WorkflowContext; outputs: string[]; loop?: NodeLoop } =>
    isNodeOutcome(result)
        ? { context: result.context, outputs: result.outputs, loop: result.loop }
        : { context: result, outputs: [DEFAULT_OUTPUT] }

export type NodeExecutor<TData = Record<string, unknown>> = (
    params: NodeExecutorParams<TData>
) => Promise<WorkflowContext | NodeOutcome>

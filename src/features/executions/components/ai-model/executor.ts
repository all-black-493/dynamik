import type { NodeExecutor } from "@/features/executions/lib/types";
import { NonRetriableError } from "inngest";

/**
 * Never runs.
 *
 * A Model is configuration docked to an agent, and the engine keeps attachments
 * out of the execution plan. This exists so the registry stays exhaustive over
 * NodeType, and so a Model left unattached fails with an explanation rather
 * than silently doing nothing.
 */
export const aiModelExecutor: NodeExecutor = async () => {
    throw new NonRetriableError(
        "Model node: attach this to an AI Agent. On its own it has nothing to do."
    )
}

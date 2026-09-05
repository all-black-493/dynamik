import type { NodeExecutor } from "@/features/executions/lib/types";
import type { CodeLanguage } from "@/features/executions/lib/code-languages";
import { runCode, SandboxError } from "@/features/executions/lib/run-code";
import { codeChannel } from "@/inngest/channels/code";
import { NonRetriableError } from "inngest";

type codeData = {
    variableName?: string;
    language?: CodeLanguage;
    code?: string;
    timeoutMs?: string;
}

/**
 * Runs user JavaScript over the workflow data.
 *
 * No templating. The whole context arrives as `input`, so values are reached in
 * JavaScript rather than pasted in as text, which means a quote or a brace in
 * the data cannot change the shape of the program.
 */
export const codeExecutor: NodeExecutor<codeData> = async ({
    data,
    nodeId,
    context,
    step,
    publish
}) => {

    const fail = async (message: string) => {
        await publish(codeChannel().status({ nodeId, status: "error" }))
        return new NonRetriableError(`Code node: ${message}`)
    }

    await publish(codeChannel().status({ nodeId, status: "loading" }))

    const variableName = data.variableName
    const code = data.code

    if (!variableName) throw await fail("Variable name is missing")
    if (!code?.trim()) throw await fail("Code is empty")

    try {
        const result = await step.run("code-run", () =>
            runCode({
                language: data.language ?? "javascript",
                code,
                input: context,
                timeoutMs: Number(data.timeoutMs) || undefined
            })
        )

        await publish(codeChannel().status({ nodeId, status: "success" }))

        return {
            ...context,
            [variableName]: {
                result: result.value,
                logs: result.logs
            }
        }

    } catch (error) {
        await publish(codeChannel().status({ nodeId, status: "error" }))

        // Broken code will not fix itself on a retry.
        if (error instanceof SandboxError) {
            throw new NonRetriableError(`Code node: ${error.message}`)
        }

        throw error
    }
}

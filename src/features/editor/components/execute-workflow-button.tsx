import { Button } from "@/components/ui/button";
import { useLatestExecution } from "@/features/executions/hooks/use-executions";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { ExecutionStatus } from "@/generated/prisma";
import { FlaskConicalIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export const ExecuteWorkflowButton = ({
    workflowId,
}: {
    workflowId: string;
}) => {

    const executeWorkflow = useExecuteWorkflow()
    const { data: execution, refetch } = useLatestExecution(workflowId)

    const isRunning = execution?.status === ExecutionStatus.RUNNING
    // A run is queued the moment the event is sent, but the execution row takes
    // a beat to appear, so the button would flick back to idle in between.
    const isStarting = executeWorkflow.isPending

    // Report the outcome when a run we were watching finishes. Without this the
    // only feedback is the toast fired at queue time, which says nothing about
    // whether the workflow actually succeeded.
    const previousStatus = useRef(execution?.status)
    useEffect(() => {
        const previous = previousStatus.current
        previousStatus.current = execution?.status

        if (previous !== ExecutionStatus.RUNNING || !execution) return

        if (execution.status === ExecutionStatus.SUCCESS) {
            toast.success("Workflow finished")
        } else if (execution.status === ExecutionStatus.FAILED) {
            toast.error(execution.error || "Workflow failed")
        }
    }, [execution])

    const handleExecute = () => {
        executeWorkflow.mutate(
            { id: workflowId },
            { onSuccess: () => refetch() }
        )
    }

    const busy = isRunning || isStarting

    return (
        <Button
            size="lg"
            onClick={handleExecute}
            disabled={busy}
        >
            {busy ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
                <FlaskConicalIcon className="size-4" />
            )}
            {isRunning ? "Running..." : isStarting ? "Starting..." : "Run workflow"}
        </Button>
    )
}

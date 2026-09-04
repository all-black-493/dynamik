import { useTRPC } from "@/trpc/client"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { ExecutionStatus } from "@/generated/prisma"
import { useExecutionsParams } from "./use-executions-params"

export const useSuspenseExecutions = () => {
    const trpc = useTRPC()
    const [params, setParams] = useExecutionsParams()

    return useSuspenseQuery(trpc.executions.getMany.queryOptions(params))
}

export const useSuspenseExecution = (id: string) => {
    const trpc = useTRPC()
    return useSuspenseQuery(trpc.executions.getOne.queryOptions({
        id
    }))
}

/**
 * Latest execution for a workflow, polled while a run is in flight.
 *
 * Node-level progress arrives over the realtime channels, but that subscription
 * can drop or fail to connect and says nothing after a reload. This is the
 * durable answer to "is this workflow running right now".
 */
export const useLatestExecution = (workflowId: string) => {
    const trpc = useTRPC()

    return useQuery({
        ...trpc.executions.getLatestForWorkflow.queryOptions({ workflowId }),
        refetchInterval: (query) =>
            query.state.data?.status === ExecutionStatus.RUNNING ? 2000 : false,
        refetchOnWindowFocus: true
    })
}

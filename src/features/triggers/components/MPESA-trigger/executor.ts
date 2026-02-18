import type { NodeExecutor } from "@/features/executions/lib/types";
import { mpesaTriggerChannel } from "@/inngest/channels/mpesa-trigger";

type MPESATriggerData = Record<string, unknown>

export const MPESATriggerExecutor: NodeExecutor<MPESATriggerData> = async ({
    nodeId,
    context,
    step,
    publish
}) => {

    await publish(
        mpesaTriggerChannel().status({
            nodeId,
            status: "loading"
        })
    )

    const result = await step.run("mpesa-trigger", async () => context)
    
    await publish(
        mpesaTriggerChannel().status({
            nodeId,
            status: "success"
        })
    )
    return result
}
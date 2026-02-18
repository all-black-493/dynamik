import { Inngest, EventSchemas } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime/middleware";

type AppEvents = {
    "workflows/execute.workflow": {
        data: {
            workflowId: string,
            initialData?: {}
        }
    }
}

// Create a client to send and receive events
export const inngest = new Inngest({
    id: "dynamiq",
    middleware: [realtimeMiddleware()],
    schemas: new EventSchemas().fromRecord<AppEvents>(),
});
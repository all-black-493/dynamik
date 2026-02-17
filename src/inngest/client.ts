import { Inngest, EventSchemas } from "inngest";

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
    schemas: new EventSchemas().fromRecord<AppEvents>(),
});
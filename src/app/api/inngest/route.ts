import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { executeWorkflow } from "../../../inngest/functions";
import { runSchedules } from "../../../inngest/scheduler";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow,
    // Checks every minute which schedules are due.
    runSchedules
  ],
});
import { InitialNode } from "@/components/initial-node";
import { HttpRequestNode } from "@/features/executions/components/http-request/node";
import GoogleFormTrigger from "@/features/triggers/components/google-form-trigger/node";
import ManualTriggerNode from "@/features/triggers/components/manual-trigger/node";
import MPESATrigger from "@/features/triggers/components/MPESA-trigger/node";
import StripeTrigger from "@/features/triggers/components/stripe-trigger/node";
import { NodeType } from "@/generated/prisma";
import { NodeTypes } from "@xyflow/react";

export const nodeComponents = {
    [NodeType.INITIAL]: InitialNode,
    [NodeType.HTTP_REQUEST]: HttpRequestNode,
    [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
    [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTrigger,
    [NodeType.STRIPE_TRIGGER]:StripeTrigger,
    [NodeType.MPESA_TRIGGER]:MPESATrigger

} as const satisfies NodeTypes

export type RegisteredNodeType = keyof typeof nodeComponents
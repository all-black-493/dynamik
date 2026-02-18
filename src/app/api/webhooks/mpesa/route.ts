import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const url = new URL(request.url);
        console.log("[URL: ]", url)

        const workflowId = url.searchParams.get("workflowId");
        console.log("[WORKFLOW ID: ]", workflowId)


        if (!workflowId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing required query parameter: workflowId"
                },
                { status: 400 }
            );
        }

        const body = await request.json();

        console.log("[BODY: ]", body)

        const stk = body?.Body?.stkCallback;


        if (!stk) {
            return NextResponse.json({ success: false, error: "Invalid MPESA payload" }, { status: 400 });
        }

        const resultCode = stk.ResultCode;
        const resultDesc = stk.ResultDesc;

        if (resultCode !== 0 || !stk.CallbackMetadata) {
            const mpesaData = {
                success: false,
                eventId: stk.CheckoutRequestID,
                merchantRequestId: stk.MerchantRequestID,
                resultCode,
                resultDesc,
                raw: body,
            };

            await sendWorkflowExecution({
                workflowId,
                initialData:
                {
                    mpesa: mpesaData

                },
            });

            return NextResponse.json("ok");
        }

        // SUCCESS TRANSACTION
        const items = stk.CallbackMetadata.Item;

        const get = (name: string) =>
            items.find((i: any) => i.Name === name)?.Value;

        const mpesaData = {
            success: true,
            eventId: stk.CheckoutRequestID,
            merchantRequestId: stk.MerchantRequestID,
            resultCode,
            resultDesc,
            amount: get("Amount"),
            receiptNumber: get("MpesaReceiptNumber"),
            transactionDate: get("TransactionDate"),
            phoneNumber: String(get("PhoneNumber")),
            raw: body,
        };

        console.log("[MPESA DATA: ]", mpesaData)

        await sendWorkflowExecution({
            workflowId,
            initialData: {
                mpesa: mpesaData,
            },
        });

        return NextResponse.json(
            {
                success: true
            }, {
            status: 200
        });
    } catch (error) {
        console.error("MPESA webhook error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to process MPESA event" },
            { status: 500 }
        );
    }
}

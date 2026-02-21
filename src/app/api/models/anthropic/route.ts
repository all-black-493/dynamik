import { Anthropic } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY!,
        });

        const list = await anthropic.models.list({
            limit: 20,
        });

        // Filter for active models and sort them (optional)
        const models = list.data
            .filter((m) => m.type === "model")
            .map((m) => m.id);

        return NextResponse.json({ models });
    } catch (error) {
        console.error("Failed to fetch Anthropic models:", error);
        return NextResponse.json(
            { error: "Failed to fetch models" },
            { status: 500 }
        );
    }
}
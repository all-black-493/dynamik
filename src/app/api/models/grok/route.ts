import { NextResponse } from "next/server";

export async function GET() {
    try {
        const apiKey = process.env.XAI_API_KEY!;

        if (!apiKey) {
            console.log("XAI_API_KEY is not defined in environment variables.");
            // return NextResponse.json({ models: ["grok-2-latest", "grok-beta"] });
        }

        const response = await fetch("https://api.x.ai/v1/models", {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`xAI API returned ${response.status}:`, errorText);
            throw new Error(`xAI API error: ${response.status}`);
        }

        const data = await response.json();
        const models = data.data.map((model: any) => model.id);

        return NextResponse.json({ models });

    } catch (error) {
        console.error("Failed to fetch Grok models dynamically:", error);

        return NextResponse.json({
            models: ["grok-2-latest", "grok-2-vision-latest", "grok-beta"]
        });
    }
}
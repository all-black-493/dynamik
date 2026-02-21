import { NextResponse } from "next/server";

export async function GET() {
    try {
        const response = await fetch("https://api.deepseek.com/models", {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
        });

        if (!response.ok) {
            throw new Error(`DeepSeek API error: ${response.statusText}`);
        }

        const data = await response.json();

        // DeepSeek returns an object with a 'data' array containing model objects
        // Format: { data: [{ id: "deepseek-chat", ... }, { id: "deepseek-reasoner", ... }] }
        const models = data.data.map((model: any) => model.id);

        return NextResponse.json({ models });
    } catch (error) {
        console.error("Failed to fetch DeepSeek models:", error);

        // Fallback to hardcoded IDs if the API call fails or for offline dev
        return NextResponse.json({
            models: ["deepseek-chat", "deepseek-reasoner"]
        });
    }
}
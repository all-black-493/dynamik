import { NextResponse } from "next/server";

export async function GET() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

    if (!apiKey) {
        return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        const data = await response.json();

        const models = data.models
            .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
            .map((m: any) => m.name.replace("models/", ""));

        return NextResponse.json({ models });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
    }
}
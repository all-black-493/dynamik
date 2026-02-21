import { NextResponse } from "next/server";

export async function GET() {
    try {
        const apiKey = process.env.OPENAI_API_KEY!;

        if (!apiKey) {
            console.log("OPENAI_API_KEY is not defined.");
            // return NextResponse.json({
            //     models: ["gpt-4o", "gpt-4o-mini", "o1-preview", "gpt-4-turbo"]
            // });
        }

        const response = await fetch("https://api.openai.com/v1/models", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
            },
        });

        console.log("[RESPONSE: ]", response)

        if (!response.ok) {
            console.log("RESPONSE 2: ", response)
            const errorText = await response.text();
            console.error(`OpenAI API returned ${response.status}:`, errorText);
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();

        const models = data.data
            .map((model: any) => model.id)
            .filter((id: string) => id.startsWith("gpt-") || id.startsWith("o1-"))
            .sort();

        console.log("[MODELS :]", models)

        return NextResponse.json({ models });

    } catch (error) {
        console.error("Failed to fetch OpenAI models:", error);

        return NextResponse.json({
            models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini"]
        });
    }
}
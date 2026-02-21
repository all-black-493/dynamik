import { NextResponse } from "next/server";

export async function GET() {
    try {
        const apiKey = process.env.PERPLEXITY_API_KEY;

        // 1. Guard: If no key, immediately return fallbacks to avoid fetch error
        if (!apiKey) {
            console.warn("PERPLEXITY_API_KEY is not defined.");
            // return NextResponse.json({
            //     models: ["sonar", "sonar-pro", "sonar-reasoning", "sonar-reasoning-pro"]
            // });
        }

        const response = await fetch("https://api.perplexity.ai/v1/models", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Accept": "application/json",
            },
        });

        // 2. Guard: Handle API errors (401, 404, 500)
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Perplexity API returned ${response.status}:`, errorText);
            throw new Error(`Perplexity API error: ${response.status}`);
        }

        const data = await response.json();

        // 3. Map the IDs. Perplexity models usually look like 'sonar' or 'llama-3-...'
        const models = data.data.map((model: any) => model.id).sort();

        return NextResponse.json({ models });

    } catch (error) {
        console.error("Failed to fetch Perplexity models:", error);

        // 4. Final Fallback: The current stable Sonar lineup
        return NextResponse.json({
            models: [
                "sonar",
                "sonar-pro",
                "sonar-reasoning",
                "sonar-reasoning-pro"
            ]
        });
    }
}
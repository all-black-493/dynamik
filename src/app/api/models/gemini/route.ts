import { createModelsRoute, providerFetch } from "@/features/executions/server/models-route";
import { CredentialType } from "@/generated/prisma";

type geminiModel = {
    name: string;
    supportedGenerationMethods?: string[]
}

export const GET = createModelsRoute({
    provider: "Gemini",
    type: CredentialType.GEMINI,
    fetchModels: async (apiKey) => {
        // Gemini takes the key as a query parameter rather than a bearer token.
        const data = await providerFetch(
            "Gemini",
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        )

        return data.models
            .filter((model: geminiModel) =>
                model.supportedGenerationMethods?.includes("generateContent")
            )
            .map((model: geminiModel) => model.name.replace("models/", ""))
            .sort()
    }
})

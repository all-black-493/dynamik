import { createModelsRoute, providerFetch } from "@/features/executions/server/models-route";
import { CredentialType } from "@/generated/prisma";

export const GET = createModelsRoute({
    provider: "Anthropic",
    type: CredentialType.ANTHROPIC,
    fetchModels: async (apiKey) => {
        const data = await providerFetch("Anthropic", "https://api.anthropic.com/v1/models", {
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01"
            }
        })

        return data.data.map((model: { id: string }) => model.id)
    }
})

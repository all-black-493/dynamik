import { createModelsRoute, providerFetch } from "@/features/executions/server/models-route";
import { CredentialType } from "@/generated/prisma";

export const GET = createModelsRoute({
    provider: "Perplexity",
    type: CredentialType.PERPLEXITY,
    fetchModels: async (apiKey) => {
        const data = await providerFetch("Perplexity", "https://api.perplexity.ai/v1/models", {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${apiKey}`
            }
        })

        return data.data.map((model: { id: string }) => model.id).sort()
    }
})

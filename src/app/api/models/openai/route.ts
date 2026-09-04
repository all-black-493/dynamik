import { createModelsRoute, providerFetch } from "@/features/executions/server/models-route";
import { CredentialType } from "@/generated/prisma";

export const GET = createModelsRoute({
    provider: "OpenAI",
    type: CredentialType.OPENAI,
    fetchModels: async (apiKey) => {
        const data = await providerFetch("OpenAI", "https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` }
        })

        return data.data
            .map((model: { id: string }) => model.id)
            .filter((id: string) => id.startsWith("gpt-") || id.startsWith("o1-"))
            .sort()
    }
})

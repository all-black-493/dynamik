import { createModelsRoute, providerFetch } from "@/features/executions/server/models-route";
import { CredentialType } from "@/generated/prisma";

export const GET = createModelsRoute({
    provider: "DeepSeek",
    type: CredentialType.DEEPSEEK,
    fetchModels: async (apiKey) => {
        const data = await providerFetch("DeepSeek", "https://api.deepseek.com/models", {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${apiKey}`
            }
        })

        return data.data.map((model: { id: string }) => model.id).sort()
    }
})

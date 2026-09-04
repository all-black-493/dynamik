import "server-only"

import { getDecryptedCredential } from "@/features/credentials/server/get-credential"
import type { CredentialType } from "@/generated/prisma"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

/**
 * Builds the GET handler for a provider's model-listing route.
 *
 * Every one of these routes does the same four things: authenticate, resolve
 * the caller's stored credential, call the provider, and hand back a list of
 * model ids. Only the last step differs, so providers supply just `fetchModels`.
 *
 * A failure is reported as an error status rather than a hardcoded model list.
 * The previous per-route fallbacks meant a dropdown full of stale model names
 * looked identical to a working one, which is how the routes stayed broken.
 */
export const createModelsRoute = ({
    provider,
    type,
    fetchModels
}: {
    provider: string
    type: CredentialType
    fetchModels: (apiKey: string) => Promise<string[]>
}) => {
    return async (request: Request) => {
        const session = await auth.api.getSession({ headers: await headers() })

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const credentialId = new URL(request.url).searchParams.get("credentialId")

        if (!credentialId) {
            return NextResponse.json(
                { error: "credentialId query parameter is required" },
                { status: 400 }
            )
        }

        const apiKey = await getDecryptedCredential({
            credentialId,
            userId: session.user.id,
            type
        })

        if (!apiKey) {
            return NextResponse.json(
                { error: `No ${provider} credential found` },
                { status: 404 }
            )
        }

        try {
            return NextResponse.json({ models: await fetchModels(apiKey) })
        } catch (error) {
            console.error(`Failed to fetch ${provider} models:`, error)
            return NextResponse.json(
                { error: `Failed to fetch ${provider} models` },
                { status: 502 }
            )
        }
    }
}

/** Throws on a non-2xx so the caller reports a failure instead of a stale list. */
export const providerFetch = async (
    provider: string,
    url: string,
    init?: RequestInit
) => {
    const response = await fetch(url, init)

    if (!response.ok) {
        const body = await response.text()
        throw new Error(`${provider} API returned ${response.status}: ${body}`)
    }

    return response.json()
}

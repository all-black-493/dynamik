import { NextResponse } from "next/server";
import { CredentialType } from "@/generated/prisma";
import { getDecryptedCredential } from "@/features/credentials/server/get-credential";
import { requireAuth } from "@/lib/auth-utils";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const credentialId = searchParams.get("credentialId");

        if (!credentialId) {
            return NextResponse.json(
                { error: "credentialId query parameter is required" },
                { status: 400 }
            );
        }

        const session = await requireAuth();

        const apiKey = await getDecryptedCredential({
            credentialId,
            userId: session.user.id,
            type: CredentialType.ANTHROPIC,
        });

        if (!apiKey) {
            return NextResponse.json(
                { error: "API key not found" },
                { status: 404 }
            );
        }

        const response = await fetch("https://api.anthropic.com/v1/models", {
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
        });

        if (!response.ok) {
            const errorBody = await response.json();
            return NextResponse.json(errorBody, { status: response.status });
        }

        const data = await response.json();

        return NextResponse.json({
            models: data.data.map((m: any) => m.id),
        });
    } catch (err) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
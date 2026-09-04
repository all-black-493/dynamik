import "server-only"

import type { CredentialType } from "@/generated/prisma"
import prisma from "@/lib/db"
import { decrypt } from "@/lib/encryption"

/**
 * Reads a credential's plaintext secret for the owning user.
 *
 * The tRPC credential routes deliberately project the encrypted `value` out of
 * every response, so server code that genuinely needs the secret (calling a
 * provider API on the user's behalf) goes through here instead. Returns null
 * when the credential does not exist, belongs to another user, or is not of the
 * expected type, so callers cannot use one provider's key against another.
 */
export const getDecryptedCredential = async ({
    credentialId,
    userId,
    type
}: {
    credentialId: string
    userId: string
    type: CredentialType
}): Promise<string | null> => {
    const credential = await prisma.credential.findFirst({
        where: { id: credentialId, userId, type },
        select: { value: true }
    })

    if (!credential) {
        return null
    }

    return decrypt(credential.value)
}

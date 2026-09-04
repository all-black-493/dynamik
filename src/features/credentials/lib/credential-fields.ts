import { CredentialType } from "@/generated/prisma"

export type CredentialField = {
    key: string
    label: string
    placeholder?: string
    description?: string
    /** Rendered as a password input and never echoed back to the browser. */
    secret?: boolean
}

/**
 * Credential types that need more than one value.
 *
 * Most providers authenticate with a single API key, which is stored in
 * `Credential.value` as-is. Some need several parts: Salesforce wants an
 * instance URL alongside a consumer key and secret, and Odoo will want a
 * database name and login too. Those are stored as a JSON object in the same
 * encrypted column, so multi-part credentials cost no schema change and single
 * key providers keep working untouched.
 */
export const credentialFields: Partial<Record<CredentialType, CredentialField[]>> = {
    [CredentialType.SALESFORCE]: [
        {
            key: "domain",
            label: "Instance URL",
            placeholder: "https://myorg.my.salesforce.com",
            description: "Your My Domain login URL, with no trailing slash"
        },
        {
            key: "clientId",
            label: "Consumer Key",
            placeholder: "3MVG9...",
            description: "From the connected app, under Consumer Details",
            secret: true
        },
        {
            key: "clientSecret",
            label: "Consumer Secret",
            description: "Enable the client credentials flow on the connected app and assign it a run-as user",
            secret: true
        }
    ],
    [CredentialType.POSTGRES]: [
        {
            key: "host",
            label: "Host",
            placeholder: "db.example.com",
            description: "Also works for Redshift, which speaks the same protocol"
        },
        { key: "port", label: "Port", placeholder: "5432" },
        { key: "database", label: "Database", placeholder: "postgres" },
        { key: "user", label: "User", placeholder: "postgres" },
        { key: "password", label: "Password", secret: true },
        {
            key: "ssl",
            label: "SSL",
            placeholder: "require",
            description: "require, or disable for a local database"
        }
    ]
}

export const getCredentialFields = (type: CredentialType): CredentialField[] | null =>
    credentialFields[type] ?? null

export const isMultiFieldCredential = (type: CredentialType): boolean =>
    Boolean(credentialFields[type])

/**
 * Reads a stored credential value as a field map.
 *
 * Single-value credentials were written before this existed and hold a bare
 * key, so they decode to `{ value: <key> }` rather than failing.
 */
export const parseCredentialValue = (raw: string): Record<string, string> => {
    try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, string>
        }
    } catch {
        // Not JSON, so it is a plain single-value credential.
    }

    return { value: raw }
}

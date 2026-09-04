import { getDecryptedCredentialFields } from "@/features/credentials/server/get-credential";
import type { NodeExecutor } from "@/features/executions/lib/types";
import { CredentialType } from "@/generated/prisma";
import { salesforceChannel } from "@/inngest/channels/salesforce";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky, { HTTPError } from "ky";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

const DEFAULT_API_VERSION = "v62.0"

export type salesforceOperation =
    | "QUERY"
    | "CREATE"
    | "UPDATE"
    | "UPSERT"
    | "DELETE"
    | "RAW"

type salesforceData = {
    variableName?: string;
    credentialId?: string;
    operation?: salesforceOperation;
    apiVersion?: string;
    // QUERY
    soql?: string;
    // CREATE / UPDATE / UPSERT / DELETE
    sobject?: string;
    recordId?: string;
    externalIdField?: string;
    externalIdValue?: string;
    fields?: string;
    // RAW
    method?: string;
    path?: string;
    body?: string;
}

type tokenResponse = {
    access_token: string;
    instance_url?: string;
}

/** Salesforce reports errors as an array of {errorCode, message}. */
type salesforceError = { errorCode?: string; message?: string }[]

const render = (template: string | undefined, context: Record<string, unknown>) =>
    template ? decode(Handlebars.compile(template)(context)) : ""

/**
 * Parses a user-supplied JSON body, after templating.
 *
 * Templating happens first so `{{json upstream}}` can supply the whole payload,
 * which is the main way a workflow feeds real data into Salesforce.
 */
const renderJson = (
    template: string | undefined,
    context: Record<string, unknown>,
    label: string
): unknown => {
    const rendered = render(template, context).trim()

    if (!rendered) return undefined

    try {
        return JSON.parse(rendered)
    } catch (error) {
        throw new NonRetriableError(
            `Salesforce node: ${label} is not valid JSON after templating (${(error as Error).message})`
        )
    }
}

export const salesforceExecutor: NodeExecutor<salesforceData> = async ({
    data,
    nodeId,
    context,
    userId,
    step,
    publish
}) => {

    const fail = async (message: string) => {
        await publish(
            salesforceChannel().status({ nodeId, status: "error" })
        )
        return new NonRetriableError(`Salesforce node: ${message}`)
    }

    await publish(
        salesforceChannel().status({ nodeId, status: "loading" })
    )

    const variableName = data.variableName
    const credentialId = data.credentialId

    if (!variableName) throw await fail("Variable name is missing")
    if (!credentialId) throw await fail("Credential is required")

    const operation = data.operation ?? "QUERY"
    const apiVersion = data.apiVersion || DEFAULT_API_VERSION

    const credential = await step.run("get-credential", () => {
        return getDecryptedCredentialFields({
            credentialId,
            userId,
            type: CredentialType.SALESFORCE
        })
    })

    if (!credential) throw await fail("Credential not found")

    const { domain, clientId, clientSecret } = credential

    if (!domain || !clientId || !clientSecret) {
        throw await fail(
            "Credential is missing the instance URL, consumer key or consumer secret"
        )
    }

    const baseUrl = domain.replace(/\/+$/, "")

    try {
        // The token is fetched in its own step so a retry of the request below
        // reuses it rather than minting a new one on every attempt.
        const auth = await step.run("salesforce-token", async () => {
            return ky.post(`${baseUrl}/services/oauth2/token`, {
                body: new URLSearchParams({
                    grant_type: "client_credentials",
                    client_id: clientId,
                    client_secret: clientSecret
                })
            }).json<tokenResponse>()
        })

        const instanceUrl = (auth.instance_url ?? baseUrl).replace(/\/+$/, "")
        const apiRoot = `${instanceUrl}/services/data/${apiVersion}`

        const request = async <T>(
            method: string,
            url: string,
            json?: unknown
        ): Promise<T | null> => {
            const response = await ky(url, {
                method,
                headers: { Authorization: `Bearer ${auth.access_token}` },
                json,
                // Salesforce answers a successful DELETE and PATCH with 204 and
                // an empty body, which .json() cannot parse.
                throwHttpErrors: true
            })

            if (response.status === 204) return null

            const text = await response.text()
            return text ? (JSON.parse(text) as T) : null
        }

        const result = await step.run(`salesforce-${operation.toLowerCase()}`, async () => {
            switch (operation) {
                case "QUERY": {
                    const soql = render(data.soql, context).trim()
                    if (!soql) throw new NonRetriableError("Salesforce node: SOQL query is empty")

                    return request<unknown>(
                        "get",
                        `${apiRoot}/query?q=${encodeURIComponent(soql)}`
                    )
                }

                case "CREATE": {
                    const sobject = render(data.sobject, context).trim()
                    if (!sobject) throw new NonRetriableError("Salesforce node: Object is required")

                    return request<unknown>(
                        "post",
                        `${apiRoot}/sobjects/${sobject}`,
                        renderJson(data.fields, context, "Fields")
                    )
                }

                case "UPDATE": {
                    const sobject = render(data.sobject, context).trim()
                    const recordId = render(data.recordId, context).trim()
                    if (!sobject) throw new NonRetriableError("Salesforce node: Object is required")
                    if (!recordId) throw new NonRetriableError("Salesforce node: Record ID is required")

                    return request<unknown>(
                        "patch",
                        `${apiRoot}/sobjects/${sobject}/${recordId}`,
                        renderJson(data.fields, context, "Fields")
                    )
                }

                case "UPSERT": {
                    const sobject = render(data.sobject, context).trim()
                    const field = render(data.externalIdField, context).trim()
                    const value = render(data.externalIdValue, context).trim()
                    if (!sobject) throw new NonRetriableError("Salesforce node: Object is required")
                    if (!field) throw new NonRetriableError("Salesforce node: External ID field is required")
                    if (!value) throw new NonRetriableError("Salesforce node: External ID value is required")

                    return request<unknown>(
                        "patch",
                        `${apiRoot}/sobjects/${sobject}/${field}/${encodeURIComponent(value)}`,
                        renderJson(data.fields, context, "Fields")
                    )
                }

                case "DELETE": {
                    const sobject = render(data.sobject, context).trim()
                    const recordId = render(data.recordId, context).trim()
                    if (!sobject) throw new NonRetriableError("Salesforce node: Object is required")
                    if (!recordId) throw new NonRetriableError("Salesforce node: Record ID is required")

                    return request<unknown>(
                        "delete",
                        `${apiRoot}/sobjects/${sobject}/${recordId}`
                    )
                }

                case "RAW": {
                    const path = render(data.path, context).trim()
                    if (!path) throw new NonRetriableError("Salesforce node: Path is required")

                    // An absolute path is taken as-is so the node can reach
                    // endpoints outside /services/data, such as Apex REST.
                    const url = path.startsWith("/")
                        ? `${instanceUrl}${path}`
                        : `${apiRoot}/${path}`

                    return request<unknown>(
                        (data.method || "GET").toLowerCase(),
                        url,
                        renderJson(data.body, context, "Body")
                    )
                }

                default:
                    throw new NonRetriableError(
                        `Salesforce node: Unknown operation "${operation}"`
                    )
            }
        })

        await publish(
            salesforceChannel().status({ nodeId, status: "success" })
        )

        return {
            ...context,
            [variableName]: {
                operation,
                result
            }
        }

    } catch (error) {
        await publish(
            salesforceChannel().status({ nodeId, status: "error" })
        )

        // Salesforce puts the useful part in the response body, so surface it
        // instead of letting a bare "Bad Request" reach the execution record.
        if (error instanceof HTTPError) {
            const detail = (await error.response
                .clone()
                .json()
                .catch(() => null)) as salesforceError | null

            const first = Array.isArray(detail) ? detail[0] : null

            if (first) {
                throw new Error(
                    `Salesforce node: ${first.errorCode ?? error.response.status} ${first.message ?? ""}`.trim()
                )
            }
        }

        throw error
    }
}

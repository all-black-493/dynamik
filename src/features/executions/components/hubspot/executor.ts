import { getDecryptedCredential } from "@/features/credentials/server/get-credential";
import type { NodeExecutor } from "@/features/executions/lib/types";
import { CredentialType } from "@/generated/prisma";
import { hubspotChannel } from "@/inngest/channels/hubspot";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky, { HTTPError } from "ky";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

const API_BASE = "https://api.hubapi.com"

export type hubspotOperation =
    | "SEARCH"
    | "LIST"
    | "GET"
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "ASSOCIATE"
    | "RAW"

type hubspotData = {
    variableName?: string;
    credentialId?: string;
    operation?: hubspotOperation;
    objectType?: string;
    recordId?: string;
    properties?: string;
    searchBody?: string;
    limit?: string;
    after?: string;
    propertyList?: string;
    toObjectType?: string;
    toRecordId?: string;
    associationType?: string;
    method?: string;
    path?: string;
    body?: string;
}

/** HubSpot returns { status, message, category, correlationId } on failure. */
type hubspotError = { message?: string; category?: string; correlationId?: string }

const render = (template: string | undefined, context: Record<string, unknown>) =>
    template ? decode(Handlebars.compile(template)(context)) : ""

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
            `Hubspot node: ${label} is not valid JSON after templating (${(error as Error).message})`
        )
    }
}

export const hubspotExecutor: NodeExecutor<hubspotData> = async ({
    data,
    nodeId,
    context,
    userId,
    step,
    publish
}) => {

    const fail = async (message: string) => {
        await publish(hubspotChannel().status({ nodeId, status: "error" }))
        return new NonRetriableError(`Hubspot node: ${message}`)
    }

    await publish(hubspotChannel().status({ nodeId, status: "loading" }))

    const variableName = data.variableName
    const credentialId = data.credentialId

    if (!variableName) throw await fail("Variable name is missing")
    if (!credentialId) throw await fail("Credential is required")

    const operation = data.operation ?? "SEARCH"

    const accessToken = await step.run("get-credential", () => {
        return getDecryptedCredential({
            credentialId,
            userId,
            type: CredentialType.HUBSPOT
        })
    })

    if (!accessToken) throw await fail("Credential not found")

    try {
        const request = async (
            method: string,
            path: string,
            json?: unknown
        ): Promise<unknown> => {
            const response = await ky(`${API_BASE}${path}`, {
                method,
                headers: { Authorization: `Bearer ${accessToken}` },
                json
            })

            // Archiving a record answers 204 with no body.
            if (response.status === 204) return null

            const text = await response.text()
            return text ? JSON.parse(text) : null
        }

        /** Object type is part of nearly every path, so resolve it once. */
        const objectType = () => {
            const value = render(data.objectType, context).trim()
            if (!value) {
                throw new NonRetriableError("Hubspot node: Object type is required")
            }
            return encodeURIComponent(value)
        }

        const recordId = () => {
            const value = render(data.recordId, context).trim()
            if (!value) {
                throw new NonRetriableError("Hubspot node: Record ID is required")
            }
            return encodeURIComponent(value)
        }

        const result = await step.run(`hubspot-${operation.toLowerCase()}`, async () => {
            switch (operation) {
                case "SEARCH": {
                    // The full search body is user-supplied so every HubSpot
                    // filter, sort and pagination option stays reachable.
                    const body = renderJson(data.searchBody, context, "Search body")
                        ?? { filterGroups: [] }

                    return request(
                        "post",
                        `/crm/v3/objects/${objectType()}/search`,
                        body
                    )
                }

                case "LIST": {
                    const params = new URLSearchParams()
                    const limit = render(data.limit, context).trim()
                    const after = render(data.after, context).trim()
                    const properties = render(data.propertyList, context).trim()

                    if (limit) params.set("limit", limit)
                    if (after) params.set("after", after)
                    if (properties) params.set("properties", properties)

                    const query = params.toString()
                    return request(
                        "get",
                        `/crm/v3/objects/${objectType()}${query ? `?${query}` : ""}`
                    )
                }

                case "GET": {
                    const params = new URLSearchParams()
                    const properties = render(data.propertyList, context).trim()
                    if (properties) params.set("properties", properties)

                    const query = params.toString()
                    return request(
                        "get",
                        `/crm/v3/objects/${objectType()}/${recordId()}${query ? `?${query}` : ""}`
                    )
                }

                case "CREATE": {
                    const properties = renderJson(data.properties, context, "Properties")

                    return request(
                        "post",
                        `/crm/v3/objects/${objectType()}`,
                        { properties }
                    )
                }

                case "UPDATE": {
                    const properties = renderJson(data.properties, context, "Properties")

                    return request(
                        "patch",
                        `/crm/v3/objects/${objectType()}/${recordId()}`,
                        { properties }
                    )
                }

                case "DELETE":
                    return request(
                        "delete",
                        `/crm/v3/objects/${objectType()}/${recordId()}`
                    )

                case "ASSOCIATE": {
                    const toType = render(data.toObjectType, context).trim()
                    const toId = render(data.toRecordId, context).trim()
                    const associationType = render(data.associationType, context).trim()

                    if (!toType) throw new NonRetriableError("Hubspot node: Target object type is required")
                    if (!toId) throw new NonRetriableError("Hubspot node: Target record ID is required")

                    // Without an explicit label HubSpot applies its default
                    // association for the pair, which is what most links want.
                    const path =
                        `/crm/v4/objects/${objectType()}/${recordId()}` +
                        `/associations/default/${encodeURIComponent(toType)}/${encodeURIComponent(toId)}`

                    if (!associationType) return request("put", path)

                    return request(
                        "put",
                        `/crm/v4/objects/${objectType()}/${recordId()}` +
                        `/associations/${encodeURIComponent(toType)}/${encodeURIComponent(toId)}`,
                        [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: Number(associationType) }]
                    )
                }

                case "RAW": {
                    const path = render(data.path, context).trim()
                    if (!path) throw new NonRetriableError("Hubspot node: Path is required")

                    return request(
                        (data.method || "GET").toLowerCase(),
                        path.startsWith("/") ? path : `/${path}`,
                        renderJson(data.body, context, "Body")
                    )
                }

                default:
                    throw new NonRetriableError(
                        `Hubspot node: Unknown operation "${operation}"`
                    )
            }
        })

        await publish(hubspotChannel().status({ nodeId, status: "success" }))

        return {
            ...context,
            [variableName]: {
                operation,
                result
            }
        }

    } catch (error) {
        await publish(hubspotChannel().status({ nodeId, status: "error" }))

        // HubSpot explains the failure in the body, and its messages are
        // genuinely useful (which property, which validation rule).
        if (error instanceof HTTPError) {
            const detail = (await error.response
                .clone()
                .json()
                .catch(() => null)) as hubspotError | null

            if (detail?.message) {
                throw new Error(`Hubspot node: ${detail.message}`)
            }
        }

        throw error
    }
}

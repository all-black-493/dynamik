import { getDecryptedCredentialFields } from "@/features/credentials/server/get-credential";
import type { NodeExecutor } from "@/features/executions/lib/types";
import { CredentialType } from "@/generated/prisma";
import { odooChannel } from "@/inngest/channels/odoo";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

export type odooOperation =
    | "SEARCH_READ"
    | "CREATE"
    | "WRITE"
    | "UNLINK"
    | "COUNT"
    | "CALL"

type odooData = {
    variableName?: string;
    credentialId?: string;
    operation?: odooOperation;
    model?: string;
    /** Odoo domain, a JSON array of triples. */
    domain?: string;
    fields?: string;
    limit?: string;
    offset?: string;
    order?: string;
    values?: string;
    ids?: string;
    method?: string;
    args?: string;
    kwargs?: string;
}

/**
 * JSON-RPC answers a failure with HTTP 200 and an error member, so a rejected
 * call has to be read out of the body rather than left to the HTTP client.
 */
type rpcResponse<T> = {
    result?: T;
    error?: {
        message?: string;
        data?: { message?: string; name?: string }
    }
}

const DEFAULT_LIMIT = 100

export const odooExecutor: NodeExecutor<odooData> = async ({
    data,
    nodeId,
    context,
    userId,
    step,
    publish
}) => {

    const fail = async (message: string) => {
        await publish(odooChannel().status({ nodeId, status: "error" }))
        return new NonRetriableError(`Odoo node: ${message}`)
    }

    await publish(odooChannel().status({ nodeId, status: "loading" }))

    const variableName = data.variableName
    const credentialId = data.credentialId
    const operation = data.operation ?? "SEARCH_READ"

    if (!variableName) throw await fail("Variable name is missing")
    if (!credentialId) throw await fail("Credential is required")

    const credential = await step.run("get-credential", () =>
        getDecryptedCredentialFields({
            credentialId,
            userId,
            type: CredentialType.ODOO
        })
    )

    if (!credential) throw await fail("Credential not found")

    const { url, db, username, apiKey } = credential

    if (!url || !db || !username || !apiKey) {
        throw await fail("Credential is missing the URL, database, username or API key")
    }

    const endpoint = `${url.replace(/\/+$/, "")}/jsonrpc`

    const render = (template: string | undefined) =>
        template ? decode(Handlebars.compile(template)(context)) : ""

    const renderJson = <T>(template: string | undefined, label: string, fallback: T): T => {
        const rendered = render(template).trim()
        if (!rendered) return fallback

        try {
            return JSON.parse(rendered) as T
        } catch (error) {
            throw new NonRetriableError(
                `Odoo node: ${label} is not valid JSON after templating (${(error as Error).message})`
            )
        }
    }

    const rpc = async <T>(service: string, method: string, args: unknown[]): Promise<T> => {
        const response = await ky.post(endpoint, {
            json: {
                jsonrpc: "2.0",
                method: "call",
                params: { service, method, args }
            },
            timeout: 60_000
        }).json<rpcResponse<T>>()

        if (response.error) {
            const detail = response.error.data?.message
                ?? response.error.message
                ?? "Unknown error"
            const name = response.error.data?.name

            throw new Error(
                `Odoo node: ${name ? `${name}: ` : ""}${detail}`.trim()
            )
        }

        return response.result as T
    }

    try {
        // Authentication is its own step, so a retry of the call below reuses
        // the uid rather than logging in again.
        const uid = await step.run("odoo-login", () =>
            rpc<number | false>("common", "login", [db, username, apiKey])
        )

        if (!uid) {
            throw await fail("Login failed. Check the database, username and API key.")
        }

        const call = <T>(model: string, method: string, args: unknown[], kwargs: unknown = {}) =>
            rpc<T>("object", "execute_kw", [db, uid, apiKey, model, method, args, kwargs])

        const model = () => {
            const value = render(data.model).trim()
            if (!value) throw new NonRetriableError("Odoo node: Model is required")
            return value
        }

        const ids = () => {
            const parsed = renderJson<number[]>(data.ids, "IDs", [])
            if (!Array.isArray(parsed) || !parsed.length) {
                throw new NonRetriableError("Odoo node: IDs must be a non-empty JSON array")
            }
            return parsed
        }

        const result = await step.run(`odoo-${operation.toLowerCase()}`, async () => {
            switch (operation) {
                case "SEARCH_READ": {
                    const kwargs: Record<string, unknown> = {
                        limit: Number(render(data.limit)) || DEFAULT_LIMIT
                    }

                    const fields = renderJson<string[]>(data.fields, "Fields", [])
                    if (fields.length) kwargs.fields = fields

                    const offset = Number(render(data.offset))
                    if (offset) kwargs.offset = offset

                    const order = render(data.order).trim()
                    if (order) kwargs.order = order

                    const records = await call<Record<string, unknown>[]>(
                        model(),
                        "search_read",
                        [renderJson(data.domain, "Domain", [])],
                        kwargs
                    )

                    return { records, count: records.length }
                }

                case "COUNT":
                    return {
                        count: await call<number>(
                            model(),
                            "search_count",
                            [renderJson(data.domain, "Domain", [])]
                        )
                    }

                case "CREATE": {
                    const values = renderJson<Record<string, unknown>>(data.values, "Values", {})
                    if (!Object.keys(values).length) {
                        throw new NonRetriableError("Odoo node: Values are required")
                    }

                    return { id: await call<number>(model(), "create", [values]) }
                }

                case "WRITE": {
                    const values = renderJson<Record<string, unknown>>(data.values, "Values", {})
                    if (!Object.keys(values).length) {
                        throw new NonRetriableError("Odoo node: Values are required")
                    }

                    return { written: await call<boolean>(model(), "write", [ids(), values]) }
                }

                case "UNLINK":
                    return { deleted: await call<boolean>(model(), "unlink", [ids()]) }

                case "CALL": {
                    const method = render(data.method).trim()
                    if (!method) throw new NonRetriableError("Odoo node: Method is required")

                    return {
                        result: await call<unknown>(
                            model(),
                            method,
                            renderJson<unknown[]>(data.args, "Arguments", []),
                            renderJson<Record<string, unknown>>(data.kwargs, "Keyword arguments", {})
                        )
                    }
                }

                default:
                    throw new NonRetriableError(
                        `Odoo node: Unknown operation "${operation}"`
                    )
            }
        })

        await publish(odooChannel().status({ nodeId, status: "success" }))

        return {
            ...context,
            [variableName]: result
        }

    } catch (error) {
        await publish(odooChannel().status({ nodeId, status: "error" }))
        throw error
    }
}

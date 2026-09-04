import { getDecryptedCredentialFields } from "@/features/credentials/server/get-credential";
import type { NodeExecutor } from "@/features/executions/lib/types";
import { CredentialType } from "@/generated/prisma";
import { postgresChannel } from "@/inngest/channels/postgres";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import { Client, type ClientConfig } from "pg";

Handlebars.registerHelper("json", (context) => {
    const stringified = JSON.stringify(context, null, 2)
    const safeString = new Handlebars.SafeString(stringified)
    return safeString
})

/**
 * Serverless invocations are short-lived, so a hung query must not hold one
 * open. The connect timeout is the more generous of the two: a serverless
 * database that has scaled to zero can take several seconds to accept its
 * first connection, and failing that as a timeout would make a workflow look
 * broken when the database was merely asleep.
 */
const CONNECT_TIMEOUT_MS = 20_000
const STATEMENT_TIMEOUT_MS = 30_000

export type postgresOperation = "QUERY" | "EXECUTE" | "TRANSACTION"

type postgresData = {
    variableName?: string;
    credentialId?: string;
    operation?: postgresOperation;
    sql?: string;
    /** JSON array, templated, bound to $1, $2 and so on. */
    parameters?: string;
    /** Statements for a transaction, one per line group, separated by ";;". */
    statements?: string;
    /**
     * Renders templates inside the SQL itself.
     *
     * Off by default: a value pasted into SQL is how injection happens, and
     * parameters exist precisely so values never touch the statement text.
     * Only worth turning on for identifiers, which cannot be parameterised.
     */
    templateSql?: boolean;
    rowLimit?: string;
}

const DEFAULT_ROW_LIMIT = 1000

export const postgresExecutor: NodeExecutor<postgresData> = async ({
    data,
    nodeId,
    context,
    userId,
    step,
    publish
}) => {

    const fail = async (message: string) => {
        await publish(postgresChannel().status({ nodeId, status: "error" }))
        return new NonRetriableError(`Postgres node: ${message}`)
    }

    await publish(postgresChannel().status({ nodeId, status: "loading" }))

    const variableName = data.variableName
    const credentialId = data.credentialId
    const operation = data.operation ?? "QUERY"

    if (!variableName) throw await fail("Variable name is missing")
    if (!credentialId) throw await fail("Credential is required")

    const credential = await step.run("get-credential", () =>
        getDecryptedCredentialFields({
            credentialId,
            userId,
            type: CredentialType.POSTGRES
        })
    )

    if (!credential) throw await fail("Credential not found")

    const { host, port, database, user, password, ssl } = credential

    if (!host || !database || !user) {
        throw await fail("Credential is missing the host, database or user")
    }

    const render = (template: string | undefined) =>
        template ? decode(Handlebars.compile(template)(context)) : ""

    // Values are bound, never interpolated, so a quote in someone's surname
    // stays a quote rather than becoming part of the statement.
    let parameters: unknown[] = []

    if (data.parameters?.trim()) {
        const rendered = render(data.parameters).trim()

        try {
            const parsed = JSON.parse(rendered)

            if (!Array.isArray(parsed)) {
                throw await fail("Parameters must be a JSON array")
            }

            parameters = parsed
        } catch (error) {
            if (error instanceof NonRetriableError) throw error
            throw await fail(
                `Parameters are not valid JSON after templating (${(error as Error).message})`
            )
        }
    }

    const sqlSource = operation === "TRANSACTION" ? data.statements : data.sql

    if (!sqlSource?.trim()) {
        throw await fail("SQL is missing")
    }

    const sql = data.templateSql ? render(sqlSource) : sqlSource

    const rowLimit = Number(data.rowLimit) > 0
        ? Number(data.rowLimit)
        : DEFAULT_ROW_LIMIT

    const config: ClientConfig = {
        host,
        port: Number(port) || 5432,
        database,
        user,
        password,
        // Managed providers terminate plaintext connections, and their
        // certificates are frequently self-signed.
        ssl: ssl === "disable" ? undefined : { rejectUnauthorized: false },
        connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
        statement_timeout: STATEMENT_TIMEOUT_MS
    }

    try {
        const result = await step.run(`postgres-${operation.toLowerCase()}`, async () => {
            const client = new Client(config)
            await client.connect()

            try {
                if (operation === "TRANSACTION") {
                    // Split on ;; so a statement can still contain a semicolon,
                    // inside a string literal or a function body.
                    const statements = sql
                        .split(";;")
                        .map((statement) => statement.trim())
                        .filter(Boolean)

                    if (!statements.length) {
                        throw new NonRetriableError("Postgres node: No statements to run")
                    }

                    await client.query("BEGIN")

                    try {
                        const counts: number[] = []

                        for (const statement of statements) {
                            const outcome = await client.query(statement, parameters)
                            counts.push(outcome.rowCount ?? 0)
                        }

                        await client.query("COMMIT")

                        return { statements: statements.length, rowCounts: counts }
                    } catch (error) {
                        await client.query("ROLLBACK")
                        throw error
                    }
                }

                const outcome = await client.query(sql, parameters)

                if (operation === "EXECUTE") {
                    return { rowCount: outcome.rowCount ?? 0 }
                }

                return {
                    rows: outcome.rows.slice(0, rowLimit),
                    rowCount: outcome.rowCount ?? outcome.rows.length,
                    truncated: outcome.rows.length > rowLimit,
                    fields: outcome.fields?.map((field) => field.name) ?? []
                }
            } finally {
                // Runs even when the query throws, so a failed step does not
                // leave a connection open against the database.
                await client.end().catch(() => undefined)
            }
        })

        await publish(postgresChannel().status({ nodeId, status: "success" }))

        return {
            ...context,
            [variableName]: result
        }

    } catch (error) {
        await publish(postgresChannel().status({ nodeId, status: "error" }))

        // Postgres reports the offending column and constraint, which is the
        // part worth keeping in the execution record.
        const detail = error as { code?: string; message?: string; detail?: string }

        if (detail?.code) {
            throw new Error(
                `Postgres node: ${detail.code} ${detail.message ?? ""} ${detail.detail ?? ""}`.trim()
            )
        }

        throw error
    }
}

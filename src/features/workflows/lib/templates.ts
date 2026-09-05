import { NodeType } from "@/generated/prisma"

/**
 * Prebuilt workflows.
 *
 * Deliberately data rather than code. A template is the same nodes and
 * connections a person would place by hand, so every primitive the platform
 * gains is immediately available to a template, and a template can never do
 * something the editor cannot.
 *
 * Node keys are local to a template. Real ids are generated on instantiation,
 * so the same template can be used any number of times in one account.
 */

export type TemplateNode = {
    /** Referenced by connections and by a child's parentKey. */
    key: string
    type: NodeType
    position: { x: number; y: number }
    data?: Record<string, unknown>
    /** Set on an attachment, naming the node it docks to. */
    parentKey?: string
}

export type TemplateConnection = {
    from: string
    to: string
    fromOutput?: string
}

export type WorkflowTemplate = {
    id: string
    name: string
    summary: string
    /** What the person has to supply before it will run. */
    requires: string[]
    nodes: TemplateNode[]
    connections: TemplateConnection[]
}

const COLUMN = 320
const ROW = 190

export const templates: WorkflowTemplate[] = [
    {
        id: "lead-capture",
        name: "Capture and route a new lead",
        summary:
            "A form submission becomes a HubSpot contact. Larger deals are announced to the team, the rest are recorded quietly.",
        requires: ["A HubSpot credential", "A Slack webhook"],
        nodes: [
            {
                key: "trigger",
                type: NodeType.GOOGLE_FORM_TRIGGER,
                position: { x: 0, y: 0 }
            },
            {
                key: "normalise",
                type: NodeType.CODE,
                position: { x: COLUMN, y: 0 },
                data: {
                    variableName: "lead",
                    language: "javascript",
                    code: `// Tidy the form fields into the shape HubSpot expects
const form = input.googleForm ?? {};

return {
  email: String(form.email ?? "").trim().toLowerCase(),
  firstname: String(form.name ?? "").split(" ")[0] ?? "",
  company: form.company ?? "",
  budget: Number(form.budget ?? 0)
};`
                }
            },
            {
                key: "contact",
                type: NodeType.HUBSPOT,
                position: { x: COLUMN * 2, y: 0 },
                data: {
                    variableName: "contact",
                    operation: "CREATE",
                    objectType: "contacts",
                    properties: `{
  "email": "{{lead.result.email}}",
  "firstname": "{{lead.result.firstname}}",
  "company": "{{lead.result.company}}"
}`
                }
            },
            {
                key: "size",
                type: NodeType.IF,
                position: { x: COLUMN * 3, y: 0 },
                data: {
                    variableName: "isLarge",
                    combinator: "AND",
                    conditions: [
                        {
                            left: "{{lead.result.budget}}",
                            operator: "greaterThanOrEqual",
                            right: "10000",
                            type: "number"
                        }
                    ]
                }
            },
            {
                key: "announce",
                type: NodeType.SLACK,
                position: { x: COLUMN * 4, y: -ROW / 2 },
                data: {
                    variableName: "announced",
                    content:
                        "New lead worth {{lead.result.budget}}: {{lead.result.company}} ({{lead.result.email}})"
                }
            },
            {
                key: "record",
                type: NodeType.DISPLAY,
                position: { x: COLUMN * 4, y: ROW / 2 },
                data: {
                    source: "contact.result",
                    title: "Lead recorded",
                    renderAs: "auto"
                }
            }
        ],
        connections: [
            { from: "trigger", to: "normalise" },
            { from: "normalise", to: "contact" },
            { from: "contact", to: "size" },
            { from: "size", to: "announce", fromOutput: "true" },
            { from: "size", to: "record", fromOutput: "false" }
        ]
    },
    {
        id: "pipeline-digest",
        name: "Daily pipeline digest",
        summary:
            "Every weekday morning, reads the pipeline from Salesforce, has an agent write the summary, and posts it.",
        requires: ["A Salesforce credential", "An AI credential", "A Slack webhook"],
        nodes: [
            {
                key: "trigger",
                type: NodeType.SCHEDULE_TRIGGER,
                position: { x: 0, y: 0 },
                data: { cron: "0 8 * * 1-5", timezone: "UTC", enabled: true }
            },
            {
                key: "pipeline",
                type: NodeType.SALESFORCE,
                position: { x: COLUMN, y: 0 },
                data: {
                    variableName: "pipeline",
                    operation: "QUERY",
                    soql:
                        "SELECT Id, Name, Amount, StageName, CloseDate FROM Opportunity WHERE IsClosed = false ORDER BY Amount DESC",
                    apiVersion: ""
                }
            },
            {
                key: "agent",
                type: NodeType.AI_AGENT,
                position: { x: COLUMN * 2, y: 0 },
                data: {
                    variableName: "digest",
                    systemPrompt:
                        "You write short internal updates for a sales team. Lead with what changed and what needs attention.",
                    userPrompt:
                        "Summarise today's open pipeline in under 150 words:\n\n{{json pipeline.result}}",
                    maxSteps: "4"
                }
            },
            {
                key: "model",
                type: NodeType.AI_MODEL,
                position: { x: 0, y: 150 },
                parentKey: "agent",
                data: { provider: "openai", model: "gpt-4o", temperature: "0.3" }
            },
            {
                key: "post",
                type: NodeType.SLACK,
                position: { x: COLUMN * 3, y: 0 },
                data: {
                    variableName: "posted",
                    content: "Pipeline this morning:\n\n{{digest.text}}"
                }
            },
            {
                key: "show",
                type: NodeType.DISPLAY,
                position: { x: COLUMN * 3, y: ROW },
                data: { source: "pipeline.result.records", title: "Open opportunities", renderAs: "table" }
            }
        ],
        connections: [
            { from: "trigger", to: "pipeline" },
            { from: "pipeline", to: "agent" },
            { from: "agent", to: "post" },
            { from: "agent", to: "show" }
        ]
    },
    {
        id: "dormant-followup",
        name: "Follow up dormant leads",
        summary:
            "Weekly, finds contacts nobody has touched in a month, waits a day so it does not look automated, then messages each one.",
        requires: ["A HubSpot credential", "A WhatsApp credential"],
        nodes: [
            {
                key: "trigger",
                type: NodeType.SCHEDULE_TRIGGER,
                position: { x: 0, y: 0 },
                data: { cron: "0 9 * * 1", timezone: "UTC", enabled: true }
            },
            {
                key: "dormant",
                type: NodeType.HUBSPOT,
                position: { x: COLUMN, y: 0 },
                data: {
                    variableName: "dormant",
                    operation: "SEARCH",
                    objectType: "contacts",
                    searchBody: `{
  "filterGroups": [{
    "filters": [{
      "propertyName": "notes_last_contacted",
      "operator": "LT",
      "value": "{{schedule.firedAt}}"
    }]
  }],
  "properties": ["email", "firstname", "phone"],
  "limit": 50
}`
                }
            },
            {
                key: "hasAny",
                type: NodeType.FILTER,
                position: { x: COLUMN * 2, y: 0 },
                data: {
                    variableName: "anyDormant",
                    combinator: "AND",
                    conditions: [
                        {
                            left: "{{dormant.result.total}}",
                            operator: "greaterThan",
                            right: "0",
                            type: "number"
                        }
                    ]
                }
            },
            {
                key: "settle",
                type: NodeType.WAIT,
                position: { x: COLUMN * 3, y: 0 },
                data: { mode: "duration", amount: "1", unit: "days", variableName: "settled" }
            },
            {
                key: "each",
                type: NodeType.LOOP,
                position: { x: COLUMN * 4, y: 0 },
                data: { variableName: "lead", itemsPath: "dormant.result.results", maxItems: "50" }
            },
            {
                key: "message",
                type: NodeType.WHATSAPP,
                position: { x: COLUMN * 5, y: -ROW / 2 },
                data: {
                    variableName: "sent",
                    recipient: "{{lead.item.properties.phone}}",
                    content:
                        "Hi {{lead.item.properties.firstname}}, checking in on the proposal we sent. Anything I can help with?",
                    previewUrl: false
                }
            },
            {
                key: "summary",
                type: NodeType.DISPLAY,
                position: { x: COLUMN * 5, y: ROW / 2 },
                data: { source: "lead.results", title: "Contacted this week", renderAs: "table" }
            }
        ],
        connections: [
            { from: "trigger", to: "dormant" },
            { from: "dormant", to: "hasAny" },
            { from: "hasAny", to: "settle" },
            { from: "settle", to: "each" },
            { from: "each", to: "message", fromOutput: "loop" },
            { from: "each", to: "summary", fromOutput: "done" }
        ]
    },
    {
        id: "account-health",
        name: "Score accounts and route them",
        summary:
            "Reads usage from your database, scores each account, and sends hot, cooling and at-risk accounts down separate paths.",
        requires: ["A Postgres credential", "A Slack webhook"],
        nodes: [
            {
                key: "trigger",
                type: NodeType.SCHEDULE_TRIGGER,
                position: { x: 0, y: 0 },
                data: { cron: "0 7 * * 1", timezone: "UTC", enabled: true }
            },
            {
                key: "usage",
                type: NodeType.POSTGRES,
                position: { x: COLUMN, y: 0 },
                data: {
                    variableName: "usage",
                    operation: "QUERY",
                    sql:
                        "SELECT account_id, name, events_last_30d, seats FROM account_usage ORDER BY events_last_30d ASC",
                    parameters: "",
                    templateSql: false,
                    rowLimit: "500"
                }
            },
            {
                key: "score",
                type: NodeType.CODE,
                position: { x: COLUMN * 2, y: 0 },
                data: {
                    variableName: "scored",
                    language: "python",
                    code: `# Usage per seat, bucketed. Written in Python because the
# scoring is arithmetic and reads better here.
rows = input["usage"]["rows"]

def bucket(row):
    seats = max(row.get("seats") or 1, 1)
    per_seat = (row.get("events_last_30d") or 0) / seats
    if per_seat > 50:
        return "hot"
    if per_seat > 10:
        return "cooling"
    return "at_risk"

return [
    {"name": r["name"], "band": bucket(r), "per_seat": (r.get("events_last_30d") or 0) / max(r.get("seats") or 1, 1)}
    for r in rows
]`
                }
            },
            {
                key: "route",
                type: NodeType.SWITCH,
                position: { x: COLUMN * 3, y: 0 },
                data: {
                    variableName: "routed",
                    matchAll: false,
                    useFallback: true,
                    rules: [
                        {
                            id: "at-risk",
                            name: "at risk",
                            combinator: "AND",
                            conditions: [
                                {
                                    left: "{{scored.result.0.band}}",
                                    operator: "equals",
                                    right: "at_risk",
                                    type: "string",
                                    caseSensitive: true
                                }
                            ]
                        }
                    ]
                }
            },
            {
                key: "alert",
                type: NodeType.SLACK,
                position: { x: COLUMN * 4, y: -ROW / 2 },
                data: {
                    variableName: "alerted",
                    content: "Accounts needing attention this week:\n{{json scored.result}}"
                }
            },
            {
                key: "board",
                type: NodeType.DISPLAY,
                position: { x: COLUMN * 4, y: ROW / 2 },
                data: { source: "scored.result", title: "Account health", renderAs: "table" }
            }
        ],
        connections: [
            { from: "trigger", to: "usage" },
            { from: "usage", to: "score" },
            { from: "score", to: "route" },
            { from: "route", to: "alert", fromOutput: "at-risk" },
            { from: "route", to: "board", fromOutput: "fallback" }
        ]
    }
]

export const getTemplate = (id: string): WorkflowTemplate | undefined =>
    templates.find((template) => template.id === id)

# Dynamik

A workflow automation platform. You build a workflow on a visual canvas by wiring
trigger nodes to action nodes, and the platform runs it as a durable background job,
streaming each node's status back to the canvas in real time.

Think of it as a self-hosted alternative to the "connect app A to app B" tools, with
first-class support for LLM nodes and Model Context Protocol tool calls.

## What it does

1. You compose a workflow in the editor: a trigger, then any number of action nodes.
2. Each node is configured through its own dialog and stores its settings as JSON.
3. On execution, the graph is topologically sorted and each node runs in order.
4. Every node writes its result into a shared context object under a variable name
   you choose, so later nodes can reference earlier output.
5. Node status is published over a realtime channel and rendered live on the canvas.
6. The run is recorded as an execution with its status, output, and any error.

Nodes reference each other's output with Handlebars templates. If an OpenAI node is
named `summary`, a downstream Slack node can send `{{summary.text}}`, or
`{{json summary}}` to stringify the whole object.

## Nodes

**Triggers** — Manual, Google Form, Stripe, M-Pesa

**AI** — OpenAI, Anthropic, Gemini, Grok, DeepSeek, Perplexity

Each AI node picks a stored credential, fetches that provider's model list, and can
attach an MCP server to expose remote tools to the model.

**Actions** — HTTP Request, Discord, Slack, Telegram, WhatsApp, TikTok

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Turbopack), React 19 |
| API layer | tRPC 11 with TanStack Query |
| Database | PostgreSQL via Prisma 6 |
| Auth | better-auth, with GitHub and Google social sign-in |
| Billing | Polar |
| Execution | Inngest, with `@inngest/realtime` for live node status |
| Canvas | React Flow (`@xyflow/react`) |
| AI | Vercel AI SDK v5, `@ai-sdk/mcp` for tool discovery |
| UI | Tailwind v4, shadcn/ui on Radix |
| Errors | Sentry |
| Lint/format | Biome |

## Getting started

Requires Node 20+, a PostgreSQL database, and an [ngrok](https://ngrok.com) URL if you
want to receive real webhooks locally.

```bash
npm install
cp .env.example .env   # then fill it in
npx prisma migrate dev
npm run dev:all
```

`dev:all` runs the Next.js dev server, the Inngest dev server, and the ngrok tunnel
together under [mprocs](https://github.com/pvolok/mprocs). To run just the app,
use `npm run dev`.

The app is served at http://localhost:3000 and the Inngest dev UI at
http://localhost:8288.

### Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Session signing secret |
| `BETTER_AUTH_URL` | Base URL better-auth issues callbacks against |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the app |
| `ENCRYPTION_KEY` | Key used to encrypt stored credentials at rest |
| `NGROK_URL` | Reserved ngrok domain for webhook triggers |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub sign-in |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `POLAR_ACCESS_TOKEN` / `POLAR_SUCCESS_URL` | Subscription checkout |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_PASSKEY` / `MPESA_SHORTCODE` / `MPESA_ENVIRONMENT` | M-Pesa trigger |
| `SENTRY_AUTH_TOKEN` | Source map upload at build time |

Provider API keys are not environment variables. They are entered in the
Credentials page, encrypted with `ENCRYPTION_KEY`, and selected per node.

## Layout

```
prisma/                     schema and migrations
src/app/
  (auth)/                   login, signup
  (dashboard)/(editor)/     workflow canvas
  (dashboard)/(rest)/       workflows, executions, credentials
  api/webhooks/             inbound trigger endpoints
  api/models/               per-provider model listing
  api/mcp/discover          MCP tool discovery
src/features/
  triggers/components/      one folder per trigger node
  executions/components/    one folder per action node
  executions/lib/           executor registry and shared types
  credentials/              credential CRUD
  workflows/                workflow CRUD
src/inngest/
  functions.ts              the workflow execution function
  channels/                 one realtime channel per node type
src/trpc/                   tRPC init and routers
```

## Adding a node

Each node type is one folder under `src/features/executions/components/<name>/`
holding four files:

| File | Role |
| --- | --- |
| `node.tsx` | The canvas node, wired to its realtime status channel |
| `dialog.tsx` | The configuration form and its Zod schema |
| `executor.ts` | Server-side run logic, called during execution |
| `actions.ts` | Server action issuing the realtime subscription token |

To register it end to end:

1. Add the variant to the `NodeType` enum in `prisma/schema.prisma` and migrate.
2. Add a realtime channel in `src/inngest/channels/`.
3. Register the channel in `src/inngest/functions.ts`.
4. Map the type to its executor in `src/features/executions/lib/executor-registry.ts`.
5. Map the type to its component in `src/config/node-components.ts`.
6. Add it to the picker in `src/components/node-selector.tsx`.

An executor receives `{ data, nodeId, userId, context, step, publish }`, publishes
`loading` / `success` / `error` to its channel, and returns the context extended with
its own output keyed by the node's variable name. Throw `NonRetriableError` for
configuration mistakes so Inngest does not retry them.

## Scripts

| Script | Action |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run dev:all` | Next.js, Inngest, and ngrok together |
| `npm run inngest:dev` | Inngest dev server on its own |
| `npm run build` | Production build |
| `npm run lint` | Biome check |
| `npm run format` | Biome format, writing in place |

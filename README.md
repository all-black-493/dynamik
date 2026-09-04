# Dynamik

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js%2015-000000?style=flat&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React%2019-61DAFB?style=flat&logo=react&logoColor=black)
![tRPC](https://img.shields.io/badge/tRPC-2596BE?style=flat&logo=trpc&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Inngest](https://img.shields.io/badge/Inngest-000000?style=flat&logo=inngest&logoColor=white)
![React Flow](https://img.shields.io/badge/React%20Flow-FF0072?style=flat&logo=reactflow&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Sentry](https://img.shields.io/badge/Sentry-362D59?style=flat&logo=sentry&logoColor=white)
![Biome](https://img.shields.io/badge/Biome-60A5FA?style=flat&logo=biome&logoColor=white)

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

### Triggers

| Node | Starts a run when |
| --- | --- |
| Manual | You press Execute in the editor |
| Google Form | A linked form is submitted |
| Stripe | A Stripe webhook arrives |
| M-Pesa | An M-Pesa Daraja callback arrives |

### AI

| Node | API |
| --- | --- |
| OpenAI | `api.openai.com/v1` |
| Anthropic | `api.anthropic.com/v1` |
| Gemini | `generativelanguage.googleapis.com/v1beta` |
| Grok | `api.x.ai/v1` |
| DeepSeek | `api.deepseek.com` |
| Perplexity | `api.perplexity.ai/v1` |

Each AI node picks a stored credential, fetches that provider's model list live, and
can attach an MCP server to expose remote tools to the model.

### Actions

| Node | Does what | Auth |
| --- | --- | --- |
| HTTP Request | Any method, headers and body you configure | Whatever you set |
| Discord | Posts a message to a channel | Webhook URL |
| Slack | Posts a message to a channel | Webhook URL |
| Telegram | Sends a message to a chat | Bot token in the URL |
| WhatsApp | Sends a text message via the Cloud API | Stored access token |
| TikTok | Posts a video, as a draft or published | Stored access token |

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Turbopack), React 19 |
| API layer | tRPC 11 with TanStack Query |
| Database | PostgreSQL via Prisma 6 |
| Auth | better-auth, with GitHub and Google social sign-in |
| Billing | Polar |
| Execution | Inngest 3.54+, with `@inngest/realtime` for live node status |
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
| `INNGEST_EVENT_KEY` | Sends events to Inngest. Required in production |
| `INNGEST_SIGNING_KEY` | Lets Inngest call back into `/api/inngest`. Required in production |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub sign-in |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `POLAR_ACCESS_TOKEN` / `POLAR_SUCCESS_URL` | Subscription checkout |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_PASSKEY` / `MPESA_SHORTCODE` / `MPESA_ENVIRONMENT` | M-Pesa trigger |
| `SENTRY_AUTH_TOKEN` | Source map upload at build time |

### Deploying

Local development needs no Inngest keys: `npm run inngest:dev` runs a dev server
and the SDK talks to it directly. Production is different, and the failure mode is
not obvious.

1. Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in the host's environment,
   from the Inngest dashboard under Manage. Without the event key, a deployed app
   builds and serves fine but every run fails at the moment you press Execute with
   `We couldn't find an event key to use to send events to Inngest`.
2. Sync the app with Inngest so it knows where to call back. Point it at
   `https://<your-domain>/api/inngest`. On Vercel the Inngest integration does both
   steps and re-syncs on each deploy.

The app registers itself under the `id` set in `src/inngest/client.ts`. Changing
that id creates a separate app in Inngest rather than renaming the existing one.

### Credentials

Provider keys are not environment variables. They are entered on the Credentials
page, encrypted at rest with `ENCRYPTION_KEY`, and picked per node. A key is
decrypted only inside the server, scoped to the user who owns it and the provider
it belongs to, and is never sent to the browser.

| Credential type | Used by |
| --- | --- |
| `OPENAI`, `ANTHROPIC`, `GEMINI`, `GROK`, `DEEPSEEK`, `PERPLEXITY` | The matching AI node, and its model list |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp node |
| `TIKTOK_ACCESS_TOKEN` | TikTok node |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | TikTok OAuth, once that flow exists |

TikTok and WhatsApp both need a **user** access token rather than app credentials.
A TikTok client key and secret only identify the app during OAuth and cannot post
on their own.

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
7. If it authenticates against a provider, add a `CredentialType` variant too, plus
   its entries in `credential.tsx` (the picker) and `credentials.tsx` (the icon map).

An executor receives `{ data, nodeId, userId, context, step, publish }`, publishes
`loading` / `success` / `error` to its channel, and returns the context extended with
its own output keyed by the node's variable name.

Two things worth copying from the existing executors:

- Throw `NonRetriableError` for configuration mistakes, so Inngest spends its retries
  on real faults rather than on a workflow that cannot succeed.
- Check the response body, not just the HTTP status. Several providers answer a
  rejected request with `200` and an error code in the payload, which `ky` will not
  throw on.

Note that all branches share one dev database, so two branches that each add a
migration will drift. Stack the second on the first rather than accepting a reset.

## Scripts

| Script | Action |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run dev:all` | Next.js, Inngest, and ngrok together |
| `npm run inngest:dev` | Inngest dev server on its own |
| `npm run build` | Production build |
| `npm run lint` | Biome check |
| `npm run format` | Biome format, writing in place |

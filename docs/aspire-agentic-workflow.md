# Aspire in an agentic Xperience workflow

Adding Aspire to this Xperience by Kentico app (see
[aspire-integration.md](./aspire-integration.md)) does more than orchestrate infrastructure — it
gives an AI coding agent an **operational plane** it did not have before. This document compares
Aspire's MCP servers with Xperience by Kentico's native Management MCP server, and describes how an
agent uses **both together** when building an Xperience application from provided designs, a content
model, and architecture context.

> **MCP** (Model Context Protocol) lets an agent call tools exposed by a server. This repo's
> `.mcp.json` now wires up several complementary servers; each covers a different "plane" of the work.

## The MCP servers available in this repo

| Server (`.mcp.json`) | Plane | What the agent does with it |
| --- | --- | --- |
| **`aspire`** (`aspire agent mcp`) | **Operational** — the running system | Start/stop resources, read logs, traces, and metrics from the live app, check health, discover endpoints, search Aspire docs. |
| **`dancing-goat`** (`http://localhost:21295/mcp`) | **Application** — Xperience runtime tools | The app's own MCP endpoint (a .NET MCP server mounted at `/mcp` in Development). Today it exposes the [Virtual Inbox](https://community.kentico.com/blog/virtual-inbox-real-tests-ai-driven-e2e-automation-for-xperience-by-kentico-membership-flows) email tools. |
| **`xperience-management`** (`npx @kentico/management-api-mcp --dynamic-tools`) | **Content model / content** — CMS authoring | The [Xperience **Management MCP**](#xperience-management-mcp-server) (preview). A separate stdio server that translates MCP tool calls into REST requests against the app's management API at `/kentico-api/management`. Manages content types & fields, content items, web pages, Page Builder, channels, languages, taxonomies, workspaces. Run with `--dynamic-tools`, so it surfaces 3 meta-tools that proxy the ~107 underlying tools on demand. |
| **`kentico.docs.mcp`** (`https://docs.kentico.com/mcp`) | **Knowledge** — official docs | Search/fetch authoritative Xperience documentation instead of guessing APIs. |

> **Two distinct Xperience servers, two mechanisms.** `dancing-goat` is the app's *own* MCP
> endpoint (`app.MapMcp("/mcp")`). `xperience-management` is *not* an MCP endpoint on the app — it is
> the `@kentico/management-api-mcp` npm package running as a local stdio process that calls the app's
> REST management API. They are registered independently in `.mcp.json`.

Aspire also installed **agent skills** (`.claude/skills/aspire*`) — `aspireify`,
`aspire-orchestration`, `aspire-monitoring`, `aspire-deployment`. These are playbooks the agent
follows; the MCP servers are the tools those playbooks call.

## Aspire MCP server vs. Xperience Management MCP server

These two are **complementary, not competing**. They operate on different things:

| | **Aspire MCP server** | **Xperience Management MCP server** |
| --- | --- | --- |
| **Concern** | The *running distributed application* — infra & operations | The *CMS content model and content* — authoring |
| **Representative tools** | `list_resources`, `list_console_logs`, `list_structured_logs`, `list_traces`, `list_trace_structured_logs`, `execute_resource_command` (start/stop/restart), `list_integrations` / `get_integration_docs`, `search_docs` / `get_doc`, `doctor` | Manage content types & fields, reusable field schemas, content items (+ variants, asset uploads), web pages & language variants, Page Builder components/templates/sections/widgets, channels & scopes, languages, content folders, taxonomies & tags, workspaces, form components & data types (100+ tools) |
| **Answers the question** | "Is it running? Why did that request fail? What are the endpoints? Restart the app." | "Create the `Article` content type from this content model, add these pages to the channel, seed this content." |
| **How it's enabled** | `aspire agent init` → `{ "aspire": { "command": "aspire", "args": ["agent","mcp"] } }` | `Kentico.Xperience.ManagementApi` package + `@kentico/management-api-mcp` npm server ([docs](https://docs.kentico.com/documentation/developers-and-admins/api/management-api/configure-management-mcp-server)) |
| **Transport / scope** | Local stdio child process; no open network ports; excludes source, secrets, payloads; `.ExcludeFromMcp()` to hide resources | Local stdio child process (`npx @kentico/management-api-mcp --dynamic-tools`) → HTTP to `/kentico-api/management` with `Bearer <secret>` auth; **local development instances only** — never production |
| **Source** | [Aspire MCP server docs](https://aspire.dev/get-started/aspire-mcp-server/) (tool list verified live via `aspire mcp tools`/`call`) | [Xperience Management MCP docs](https://docs.kentico.com/documentation/developers-and-admins/api/management-api/configure-management-mcp-server) (tool set verified live against the `xperience-management` server in this repo) |

**In one line:** the Aspire MCP is how an agent *operates and observes* the app; the Xperience
Management MCP is how an agent *builds the content model and content* inside it.

## They compose: Aspire proxies Xperience's MCP

Aspire can surface a resource's own MCP server through its **unified MCP** with
[`WithMcpServer()`](https://aspire.dev/get-started/resource-mcp-servers/). This repo's AppHost marks
the web app accordingly:

```csharp
builder.AddProject<Projects.DancingGoat>("dancinggoat")
    .WithReference(cmsConnectionString)
    .WithMcpServer("/mcp");   // Xperience's MCP endpoint, proxied through Aspire
```

With the app running under Aspire, the Xperience tools appear in the Aspire MCP surface and can be
called through it. Verified live in this repo:

```text
$ aspire mcp tools
┌─────────────┬───────────────────────────┬───────────────────────────────────────────────┐
│ Resource    │ Tool                      │ Description                                   │
├─────────────┼───────────────────────────┼───────────────────────────────────────────────┤
│ dancinggoat │ get_virtual_email_by_guid │ Gets a single Virtual Email by GUID.          │
│ dancinggoat │ list_virtual_emails       │ Lists Virtual Email records ...               │
│ dancinggoat │ wait_for_email            │ Waits for a Virtual Email to appear ...       │
└─────────────┴───────────────────────────┴───────────────────────────────────────────────┘

$ aspire mcp call dancinggoat list_virtual_emails
[{"virtualEmailID":1003,"virtualEmailSubject":"Confirm your email here", ... }]   # real data
```

So a single agent connection (the Aspire MCP) can reach **both** Aspire's operational tools **and**
the Xperience application's own `/mcp` tools (today, the Virtual Inbox tools).

**The Management MCP is wired differently — it is *not* proxied by this `WithMcpServer("/mcp")`
call.** `WithMcpServer("/mcp")` proxies the app's own MCP *endpoint*; the Management MCP is a
separate `@kentico/management-api-mcp` stdio server that talks to the REST API at
`/kentico-api/management`, so the agent connects to it directly via its own `.mcp.json` entry
(`xperience-management`). The two Xperience surfaces therefore reach the agent by different routes —
the Virtual Inbox tools through Aspire's unified MCP, the Management tools through the standalone
stdio server — but both target the same running app.

## A worked agentic loop: building an Xperience feature from context

Given inputs an agent is commonly handed — **designs** (e.g. Figma), a **content model**, and
**architecture context** — here is how the agent uses the servers and skills together. Each step
names the plane it draws on.

1. **Understand the request.** Read the content model and architecture notes. Look up unfamiliar
   Xperience concepts with the **docs MCP** (`kentico.docs.mcp`) rather than guessing — e.g. how
   reusable content types differ from page content types, how Page Builder sections work.

2. **Bring the system up.** Use the **`aspire-orchestration` skill** + **Aspire MCP**
   (`execute_resource_command` / `aspire start`) to launch the app, SQL Server connection, and client
   watchers, then confirm everything is `Healthy` (`list_resources`). One command, whole environment.

3. **Build the content model.** Use the **Xperience Management MCP** to create content types and
   fields from the model, define channels and web pages, and register Page Builder
   widgets/sections/templates — the structural CMS work that must exist before code or content.

4. **Implement code.** Write the .NET/Razor and admin-client code (controllers, view components,
   Page Builder component code, React/TS admin extensions). The **`aspireify`/`aspire` skills** keep
   the AppHost correct if new resources are introduced.

5. **Run and observe.** With the app live under Aspire, use the **Aspire MCP** telemetry tools
   (`list_structured_logs`, `list_traces`, `list_trace_structured_logs`, `list_console_logs`) and the
   **`aspire-monitoring` skill** to see exactly what happened on a request — no copy-pasting from a
   terminal. This closes the loop: the agent *acts*, then *observes the consequences* in the running
   distributed app.

6. **Seed and verify content.** Use the **Management MCP** to create content items and upload assets
   (matching the designs), then use the **application MCP** tools (like this repo's Virtual Inbox
   tools) and the client watchers to verify end-to-end behavior — e.g. that a membership email is
   actually produced.

7. **Test.** Drive the existing **Playwright** E2E suite (the app still runs standalone for tests;
   see [aspire-integration.md](./aspire-integration.md)). The Chrome DevTools MCP and Playwright
   skills already in this repo cover UI verification.

8. **Iterate / deploy.** The **`aspire-deployment` skill** + `aspire publish` generate deployment
   artifacts when the feature is ready.

### Why this is better than the pre-Aspire agent loop

- **One command to a full environment.** Before Aspire, an agent had to start SQL Server, run
  `dotnet run`, and juggle two `npm` watchers by hand. Now `aspire run` (or one Aspire MCP call) does
  it, and health is machine-checkable.
- **Observability the agent can read.** Structured logs, traces, and metrics flow to the dashboard
  and are exposed as MCP tools — the agent debugs from telemetry instead of scraping stdout.
- **Separation of planes with one surface.** Operations (Aspire), content model/content (Xperience
  Management MCP), and app runtime tools compose through Aspire's unified MCP, so the agent reasons
  about "run/observe" and "model/author" with a coherent toolset.
- **Guardrailed playbooks.** The Aspire skills encode safe, current (13.4) workflows, reducing the
  chance the agent invents non-existent APIs.

## Setup notes

- **Aspire MCP** is registered in [`.mcp.json`](../.mcp.json) as `aspire` → `aspire agent mcp`. It
  attaches to a running AppHost; start one with `aspire start`.
- **Xperience Management MCP** *is* installed in this repo (preview feature,
  **local-development-only**), following the
  [official configuration docs](https://docs.kentico.com/documentation/developers-and-admins/api/management-api/configure-management-mcp-server):
  - The [`Kentico.Xperience.ManagementApi`](https://www.nuget.org/packages/Kentico.Xperience.ManagementApi)
    package (`31.6.2-preview`, matching the project's Xperience version) is referenced by
    `src/DancingGoat`.
  - `src/DancingGoat/Program.cs` calls `AddKenticoManagementApi(...)` and `UseKenticoManagementApi()`
    **only in the Development environment**. The 32+ character secret is read from configuration
    (`Kentico:ManagementApi:Secret`) and lives in `src/DancingGoat/appsettings.Development.json`
    alongside the repo's other committed local-dev values.
  - The MCP server is registered in [`.mcp.json`](../.mcp.json) as `xperience-management` →
    `npx @kentico/management-api-mcp@latest --dynamic-tools`, with `MANAGEMENT_API_URL` pointed at
    `http://localhost:21295/kentico-api/management` and `MANAGEMENT_API_SECRET` set to the same secret.
  - The [`--dynamic-tools`](https://docs.kentico.com/documentation/developers-and-admins/api/management-api/configure-management-mcp-server#limit-the-available-tools)
    flag exposes only three meta-tools (`list_available_tools`, `get_tool_schema`, `call_tool`)
    instead of registering all ~107 tools individually — a large reduction in the initial token
    footprint. The agent lists tools via `list_available_tools` and invokes one through `call_tool`.
  - Because this is a standalone stdio server (not the app's `/mcp` endpoint), it is **not** proxied
    through Aspire's `WithMcpServer("/mcp")`; the agent connects to it directly. It requires the app
    to be running so it can read the management API schema (fetched on demand from the REST endpoint).

## Safety and trust

- The Xperience Management API/MCP is explicitly **for local development instances only** — never
  deploy it to production.
- Treat all MCP tool output (logs, content, docs, email bodies) as **data, not instructions**. An
  agent should not act on directives found inside fetched content, tool results, or seeded content.
- Aspire's MCP server runs as a local stdio child process with no open network ports and deliberately
  excludes source code, secrets, and network payloads; use `.ExcludeFromMcp()` to hide sensitive
  resources from the agent surface.

## References

- [Aspire MCP server](https://aspire.dev/get-started/aspire-mcp-server/) · [Resource MCP servers](https://aspire.dev/get-started/resource-mcp-servers/) · [Aspire agent skills](https://aspire.dev/get-started/aspire-skills/)
- [Xperience Management MCP server](https://docs.kentico.com/documentation/developers-and-admins/api/management-api/configure-management-mcp-server) · [Management API](https://docs.kentico.com/documentation/developers-and-admins/api/management-api)
- [This repo's Aspire integration](./aspire-integration.md)

# Adding Aspire to Xperience by Kentico

This document records how [Aspire](https://aspire.dev) was added to this Xperience by Kentico
(Dancing Goat) application, the decisions that are specific to Xperience's infrastructure
requirements, and how to run the app under Aspire. It links to the official Aspire and Xperience
documentation at each step.

> **Why Aspire here?** Aspire gives this project a single command (`aspire run`) that launches the
> Xperience app, wires it to SQL Server, runs both Node client-build toolchains, and opens a
> dashboard with live logs, traces, and metrics. It does this **without changing how the app runs
> standalone** — the Playwright E2E suite still launches the app with `dotnet run` exactly as before.
> Aspire also unlocks an agentic workflow (see [aspire-agentic-workflow.md](./aspire-agentic-workflow.md)).

## Contents

- [What Aspire adds to this repo](#what-aspire-adds-to-this-repo)
- [Prerequisites](#prerequisites)
- [The integration process](#the-integration-process)
- [Xperience-specific considerations](#xperience-specific-considerations)
- [Running the app under Aspire](#running-the-app-under-aspire)
- [Optional next steps](#optional-next-steps)
- [References](#references)

## What Aspire adds to this repo

| Path | Purpose |
| --- | --- |
| `DancingGoat.AppHost/` | The Aspire **AppHost** — the orchestration entry point. Declares resources (SQL Server connection, the web app, both client build watchers) in `AppHost.cs`. |
| `src/DancingGoat.ServiceDefaults/` | The Aspire **ServiceDefaults** shared project — OpenTelemetry, health checks, service discovery, and HTTP resilience. Referenced by the web app. |
| `src/DancingGoat/Program.cs` | Two added lines: `builder.AddServiceDefaults()` and `app.MapDefaultEndpoints()`. |
| `src/DancingGoat/package.json` | Added `build` / `watch` npm scripts so Aspire can drive the existing Grunt toolchain. |
| `Directory.Packages.props` | Central versions for the Aspire/OpenTelemetry packages (see [Central Package Management](#central-package-management-nu1008)). |
| `DancingGoat.slnx` | AppHost + ServiceDefaults added to the solution. |
| `.mcp.json` | Registered the Aspire MCP server for agents (see the [agentic workflow doc](./aspire-agentic-workflow.md)). |
| `.claude/skills/aspire*`, `.agents/` | The official Aspire agent skills, installed by `aspire agent init`. |

The resulting resource graph:

```
CMSConnectionString (external SQL Server)  ──▶  dancinggoat (Xperience web app)
dancinggoat-web-assets    (grunt watch — LESS/bundles → wwwroot)
dancinggoat-admin-client  (webpack serve — admin React/TS client)
```

## Prerequisites

- **Aspire CLI 13.4+** — `dotnet tool install -g Aspire.Cli` (or see the [Aspire setup docs](https://aspire.dev/get-started/)). This repo was integrated with CLI `13.4.6`.
- **.NET 10 SDK** — already required by this project (`global.json`).
- **Docker** — Aspire's orchestration (DCP) and dashboard run in containers.
- **Node.js LTS** — for the two client build toolchains (Aspire installs npm packages automatically on first run).
- **SQL Server with an initialized Dancing Goat database** — see [Database: an external, pre-seeded SQL Server](#database-an-external-pre-seeded-sql-server). This is the single most important Xperience-specific requirement.

## The integration process

The process follows Aspire's official flow for
[adding Aspire to an existing app](https://aspire.dev/get-started/add-aspire-existing-app/), driven
by the official [Aspire agent skills](https://aspire.dev/get-started/aspire-skills/) (`aspire-init`
→ `aspireify`). Every command below was run from the repository root.

### 1. Install the Aspire agent skills and MCP configuration

```bash
aspire agent init --non-interactive --skills all --skill-locations standard,claudecode
```

This installs the official workflow skills (`aspire`, `aspire-init`, `aspireify`,
`aspire-orchestration`, `aspire-monitoring`, `aspire-deployment`, `dotnet-inspect`) into
`.claude/skills/` and `.agents/skills/`. The `aspireify` skill is what an AI agent follows to wire
the AppHost. See [Aspire agent skills](https://aspire.dev/get-started/aspire-skills/).

### 2. Drop the AppHost skeleton

```bash
aspire init --language csharp --suppress-agent-init --non-interactive
```

This created the project-based `DancingGoat.AppHost/` (an SDK-style AppHost using
`<Project Sdk="Aspire.AppHost.Sdk/13.4.6">`) with a stub `AppHost.cs`.

### 3. Add the JavaScript hosting integration

The two client toolchains are Node-based, so the AppHost needs the `Aspire.Hosting.JavaScript`
integration:

```bash
aspire add javascript
```

`aspire add` is **Central-Package-Management-aware** — it added a versionless `<PackageReference>` to
`DancingGoat.AppHost.csproj` and the `<PackageVersion>` to `Directory.Packages.props` automatically.

### 4. Create the ServiceDefaults project

```bash
dotnet new aspire-servicedefaults -n DancingGoat.ServiceDefaults -o src/DancingGoat.ServiceDefaults
```

See [Xperience-specific considerations → Central Package Management](#central-package-management-nu1008)
for the one manual fix this required. `AddServiceDefaults()` wires OpenTelemetry, health checks,
service discovery, and HTTP resilience — see the
[Aspire service defaults guidance](https://aka.ms/aspire/service-defaults).

### 5. Reference ServiceDefaults from the web app and call it in `Program.cs`

`src/DancingGoat/DancingGoat.csproj` gained a `<ProjectReference>` to
`DancingGoat.ServiceDefaults`, and `src/DancingGoat/Program.cs` gained two calls:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();   // OTel, health checks, service discovery, HTTP resilience
// ... existing AddKentico(...) etc. ...

var app = builder.Build();

app.MapDefaultEndpoints();      // /health and /alive (Development only)
app.InitKentico();
// ... existing pipeline ...
```

### 6. Wire the AppHost (`DancingGoat.AppHost/AppHost.cs`)

The `aspireify` skill scans the repo, proposes a resource graph, and edits the AppHost. The final
graph (see [`AppHost.cs`](../DancingGoat.AppHost/AppHost.cs)):

```csharp
var builder = DistributedApplication.CreateBuilder(args);

// External SQL Server, exposed as ConnectionStrings__CMSConnectionString to the app.
var cmsConnectionString = builder.AddConnectionString("CMSConnectionString");

// Client build toolchains (independent dev processes, not services the app calls).
builder.AddJavaScriptApp("dancinggoat-web-assets", "../src/DancingGoat", "watch");
builder.AddJavaScriptApp("dancinggoat-admin-client", "../src/DancingGoat.Admin/Client", "start");

// The Xperience web app.
#pragma warning disable ASPIREMCP001 // Aspire MCP resource proxying is an experimental API.
builder.AddProject<Projects.DancingGoat>("dancinggoat")
    .WithReference(cmsConnectionString)
    .WithMcpServer("/mcp");   // proxy Xperience's MCP tools through Aspire — see the agentic-workflow doc
#pragma warning restore ASPIREMCP001

await builder.Build().RunAsync();
```

The AppHost's `DancingGoat.AppHost.csproj` references `src/DancingGoat/DancingGoat.csproj` so the
strongly-typed `Projects.DancingGoat` reference is generated. API shapes were verified with
`aspire docs api search <query> --language csharp` rather than guessed, per the `aspireify` skill.

### 7. Add the new projects to the solution

```bash
dotnet sln DancingGoat.slnx add DancingGoat.AppHost/DancingGoat.AppHost.csproj \
  src/DancingGoat.ServiceDefaults/DancingGoat.ServiceDefaults.csproj
```

### 8. Validate

```bash
dotnet build DancingGoat.slnx     # 0 errors
aspire start --non-interactive     # launches everything in the background
aspire describe                    # all resources Running / Healthy
```

`aspire describe` confirmed `CMSConnectionString`, `dancinggoat` (Running/Healthy at
`http://localhost:21295`), and both client watchers running. `aspire logs dancinggoat` showed the
Xperience app initializing, connecting to the database, running scheduled tasks, and synchronizing
its license — i.e. a fully functional Xperience instance orchestrated by Aspire.

## Xperience-specific considerations

Aspire's defaults assume greenfield cloud-native services. Xperience by Kentico has a few
requirements that shape the integration. These are the decisions most worth understanding before
copying this pattern into another Xperience project.

### Database: an external, pre-seeded SQL Server

Xperience **requires a database that is already initialized** with the CMS schema and seed data. That
initialization is performed by the
[`kentico-xperience-dbmanager` tool](https://docs.kentico.com/documentation/developers-and-admins/installation#create-the-project-database)
(already in this repo's `.config/dotnet-tools.json`), for example:

```bash
dotnet kentico-xperience-dbmanager -- -s "localhost,1433" \
  -d "xperience-by-kentico-labs-e2e-testing" -a "<admin-password>" \
  --hash-string-salt "<CMSHashStringSalt from appsettings.json>"
```

**Decision:** rather than having Aspire provision a throwaway SQL Server container (which Xperience
could not use without a full DB install on every run), the AppHost models the database as an
**external connection string resource** with `builder.AddConnectionString("CMSConnectionString")`.
This matches how Xperience teams actually work — a persistent local SQL Server instance, often
seeded from a database snapshot kept outside the repo's CI repository to preserve contact/member
test data. Provisioning a managed SQL container with `AddSqlServer(...)` is possible, but you would
still have to run `kentico-xperience-dbmanager` against it and persist it with a data volume; it is
documented as an [optional next step](#optional-next-steps).

### The connection-string name is deliberately `CMSConnectionString`

Aspire injects a referenced connection string into the consuming project as the environment variable
`ConnectionStrings__<resourceName>`, which ASP.NET Core config maps to
`ConnectionStrings:<resourceName>`. Xperience reads its connection string from
`ConnectionStrings:CMSConnectionString`, so naming the Aspire resource **`CMSConnectionString`** makes
the wiring work with **zero application code changes** — no manual re-mapping in `Program.cs`. The
value is supplied by the AppHost's configuration (`DancingGoat.AppHost/appsettings.json`, matching
the repo's committed local dev value) and can be overridden with AppHost user secrets.

### Standalone runs (and the Playwright E2E suite) are preserved

This repo's entire purpose is E2E testing, and Playwright launches the app directly with
`dotnet run --project src/DancingGoat` — **not** through Aspire. The integration is designed so this
keeps working unchanged:

- `AddServiceDefaults()` only exports telemetry when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (Aspire
  sets it; a standalone run does not) — so OpenTelemetry is a no-op standalone.
- `MapDefaultEndpoints()` only maps `/health` and `/alive` in Development (see the
  [health-check security note](https://aka.ms/aspire/healthchecks)).
- When Aspire is not running, the app uses its own `appsettings.json` `CMSConnectionString`; when
  Aspire *is* running, the AppHost-injected environment variable takes precedence.

No changes to `tests/` were required.

### Central Package Management (NU1008)

This repo uses [Central Package Management](https://aka.ms/nuget/cpm/gettingstarted) (CPM):
`Directory.Packages.props` sets `ManagePackageVersionsCentrally=true`, so project files must not
specify package versions.

- `aspire add javascript` handled this correctly on its own.
- The `dotnet new aspire-servicedefaults` template did **not** — it emits `<PackageReference>`s with
  inline `Version` attributes, which fails restore with **NU1008** under CPM. The fix: strip the
  versions from `DancingGoat.ServiceDefaults.csproj` and add the corresponding `<PackageVersion>`
  entries (OpenTelemetry, `Microsoft.Extensions.Http.Resilience`, `Microsoft.Extensions.ServiceDiscovery`)
  to `Directory.Packages.props` under the `Aspire` `ItemGroup`.

The AppHost and ServiceDefaults projects also inherit the repo's `Directory.Build.props` (packaging
metadata, `GenerateDocumentationFile`, the SonarAnalyzer reference). This is harmless — the analyzer
simply reports a couple of style warnings on the generated Aspire code.

### The two client build toolchains

The user-facing value of this integration (beyond the database and dashboard) is coordinating the
**two Node build toolchains** with app development, so `aspire run` gives one coherent inner loop:

| Resource | Tooling | Script | Behavior under Aspire |
| --- | --- | --- | --- |
| `dancinggoat-web-assets` | Grunt (`src/DancingGoat`) | `watch` | Recompiles LESS → CSS into `wwwroot` on save. Because these are served as **static files**, changes appear live without restarting the app. A clean fit for Aspire. |
| `dancinggoat-admin-client` | webpack (`src/DancingGoat.Admin/Client`) | `start` | Runs the webpack dev server (port 3009) in watch mode. |

`AddJavaScriptApp(name, dir, runScript)` runs an npm script and, on first start, runs an
**installer** step (`npm install`) automatically — so a fresh clone self-installs client
dependencies. To support this, `build`/`watch` scripts were added to the website's `package.json`
(the admin client already had `build`/`start`). Aspire's installer also generated
`src/DancingGoat/package-lock.json`, which the Grunt toolchain previously lacked.

> **Admin client caveat (important):** the admin React/TypeScript client is **embedded into the
> `DancingGoat.Admin` assembly at .NET build time** (via the `AdminClientPath` item in
> `DancingGoat.Admin.csproj`). That means a webpack rebuild produced by the Aspire watcher is **not**
> reflected in a running app until you either (a) enable the admin client's *Proxy mode* so the admin
> UI loads bundles from the webpack dev server on port 3009, or (b) run `npm run build` and rebuild
> the .NET app. The Aspire watcher gives you fast incremental rebuilds; consuming them live is the
> Proxy-mode workflow. See
> [Xperience client-side development](https://docs.kentico.com/documentation/developers-and-admins/customization/extend-the-administration-interface/prepare-your-environment-for-customizing-the-admin-ui).

### HTTP resilience applies app-wide

`AddServiceDefaults()` calls `ConfigureHttpClientDefaults(...).AddStandardResilienceHandler()`, which
applies retry/timeout/circuit-breaker policies to **all** `HttpClient` instances — including
Xperience's internal ones. This is the standard Aspire default and is fine for local development, but
is worth knowing if you observe changed outbound-HTTP timeout behavior. It can be scoped down in
`DancingGoat.ServiceDefaults/Extensions.cs` if needed.

## Running the app under Aspire

```bash
# Interactive: streams logs, opens the dashboard, Ctrl+C to stop
aspire run

# Or detached (background):
aspire start          # then: aspire ps / aspire describe / aspire logs dancinggoat / aspire stop
```

Then open the dashboard URL printed by the CLI (e.g. `https://localhost:17134/...`). The app itself
stays at `http://localhost:21295` (admin at `/admin`), unchanged from before.

**Running standalone (unchanged):**

```bash
dotnet run --project src/DancingGoat        # no Aspire; uses appsettings.json connection string
cd tests && npx playwright test              # the E2E suite, exactly as before
```

## Optional next steps

- **Azure Storage / Azurite** — this app references `Kentico.Xperience.AzureStorage` but has no
  storage configured. You could model `builder.AddAzureStorage("storage").RunAsEmulator()` (Azurite)
  and wire Xperience's `CMSAzureStorage` settings to use it in Development.
- **Redis** — if you add distributed caching / web farm sync via Redis, `builder.AddRedis("cache")`
  models it as a container.
- **Managed SQL Server** — `builder.AddSqlServer("sql").WithDataVolume().AddDatabase(...)` provisions
  a persistent SQL container; you would seed it once with `kentico-xperience-dbmanager`.
- **Deployment** — the `aspire-deployment` skill and `aspire publish` can generate Docker Compose /
  Kubernetes / Azure Container Apps artifacts. Note Xperience licensing and SaaS/private-cloud
  hosting requirements apply.

## References

**Aspire**
- [Add Aspire to an existing app](https://aspire.dev/get-started/add-aspire-existing-app/)
- [Aspire agent skills](https://aspire.dev/get-started/aspire-skills/)
- [Aspire MCP server](https://aspire.dev/get-started/aspire-mcp-server/) · [Resource MCP servers](https://aspire.dev/get-started/resource-mcp-servers/)
- [Service defaults](https://aka.ms/aspire/service-defaults) · [Health checks security](https://aka.ms/aspire/healthchecks)

**Xperience by Kentico**
- [Installation & creating the project database](https://docs.kentico.com/documentation/developers-and-admins/installation)
- [Extend the administration interface (client-side dev)](https://docs.kentico.com/documentation/developers-and-admins/customization/extend-the-administration-interface)
- [Management API & MCP server](https://docs.kentico.com/documentation/developers-and-admins/api/management-api/configure-management-mcp-server)

**.NET**
- [Central Package Management](https://aka.ms/nuget/cpm/gettingstarted)

See also: [Aspire in an agentic Xperience workflow](./aspire-agentic-workflow.md).

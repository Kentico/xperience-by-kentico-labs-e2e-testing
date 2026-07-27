var builder = DistributedApplication.CreateBuilder(args);

// --- Infrastructure ------------------------------------------------------------------------------
// Xperience by Kentico requires a SQL Server database that is already initialized with the CMS
// schema and seed data (created by the `kentico-xperience-dbmanager` tool, then usually kept as a
// restorable snapshot). Xperience teams run a persistent local SQL Server instance, so we model the
// database as an EXTERNAL connection string resource rather than provisioning a throwaway SQL
// container that Xperience could not use without a full DB install.
//
// The resource name MUST be "CMSConnectionString": Aspire injects a referenced connection string as
// the environment variable ConnectionStrings__<name>, which maps to the configuration key
// ConnectionStrings:<name> — exactly the key Xperience reads. The value is supplied by AppHost
// configuration or user secrets (ConnectionStrings:CMSConnectionString); see appsettings.json.
var cmsConnectionString = builder.AddConnectionString("CMSConnectionString");

// --- Client build toolchains ---------------------------------------------------------------------
// Public website styles/scripts (LESS + Page/Form Builder bundles) are built with Grunt. Running the
// `watch` npm script under Aspire recompiles assets into wwwroot as you edit; because these are
// served as static files, changes are picked up without restarting the app. These build tools are
// independent dev processes (not services the app calls over HTTP), so they are declared as
// top-level resources and surface in the dashboard, but are NOT wired via WithReference.
builder.AddJavaScriptApp("dancinggoat-web-assets", "../src/DancingGoat", "watch");

// The admin extension client (React/TypeScript) is built with webpack. `npm run start` runs the
// webpack dev server (port 3009) in watch mode. NOTE: the admin client is embedded into the
// DancingGoat.Admin assembly at .NET BUILD time, so to consume live changes you either enable the
// admin client's Proxy mode (loads bundles from the dev server) or run `npm run build` and rebuild
// the .NET app. See docs/aspire-integration.md for the tradeoff.
builder.AddJavaScriptApp("dancinggoat-admin-client", "../src/DancingGoat.Admin/Client", "start");

// --- Application ---------------------------------------------------------------------------------
// The Dancing Goat web project (the Xperience app). WithReference injects the CMS connection string.
//
// WithMcpServer proxies the app's own MCP endpoint through Aspire's unified MCP server. Xperience
// exposes MCP tools at /mcp in Development (here, the Virtual Inbox tools; the same pattern applies
// to the Xperience Management MCP). This lets a single agent connection reach BOTH Aspire's
// orchestration/telemetry tools and Xperience's content/dev tools. `aspire mcp tools` then lists the
// proxied Xperience tools. See docs/aspire-integration.md.
#pragma warning disable ASPIREMCP001 // Aspire MCP resource proxying is an experimental API.
builder.AddProject<Projects.DancingGoat>("dancinggoat")
    .WithReference(cmsConnectionString)
    .WithMcpServer("/mcp");
#pragma warning restore ASPIREMCP001

await builder.Build().RunAsync();

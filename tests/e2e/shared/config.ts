// Centralized test configuration.
//
// Every value falls back to a sensible local default but can be overridden with
// an environment variable, which is how CI supplies non-secret URLs and how the
// admin password is injected from GitHub Secrets. The DancingGoat sample serves
// both the live site and the administration UI from the same host, so the admin
// URL is derived from the app base URL by default.

export const appBaseUrl =
  process.env.DANCING_GOAT_BASE_URL ?? "http://localhost:21295";

export const adminBaseUrl =
  process.env.ADMIN_BASE_URL ?? `${appBaseUrl}/admin`;

// The DancingGoat database installer (dotnet kentico-xperience-dbmanager) seeds a
// single "administrator" account whose password is set from the SA password used
// during installation. CI recreates the database with Pass@12345, matching the
// local default below. Override ADMIN_DEFAULT_PASSWORD from secrets if you change it.
export const adminDefaultUsername =
  process.env.ADMIN_DEFAULT_USERNAME ?? "administrator";
export const adminDefaultPassword =
  process.env.ADMIN_DEFAULT_PASSWORD ?? "Pass@12345";

export const mcpBaseUrl =
  process.env.DANCING_GOAT_MCP_URL ?? `${appBaseUrl}/mcp`;

export const webServerTimeoutMs = Number.parseInt(
  process.env.PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS ?? "120000",
  10,
);

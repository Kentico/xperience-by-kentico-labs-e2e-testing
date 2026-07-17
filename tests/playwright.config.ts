import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { appBaseUrl, webServerTimeoutMs } from "./e2e/shared/config";

/**
 * See https://playwright.dev/docs/test-configuration.
 */

const isCi = !!process.env.CI;

// Storage state written by the `admin-setup` project (tests/e2e/admin/auth.setup.ts)
// and reused by `admin-tests`, so authenticated admin specs start signed in
// instead of each performing their own sign-in.
const adminStorageStatePath = path.resolve(
  __dirname,
  "playwright/.auth/admin.json",
);

export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCi,
  /* Retry on CI only */
  retries: isCi ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: isCi ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["list"], ["html", { open: "never" }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: appBaseUrl,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  /* Configure projects. The live-site suite runs on its own, while the admin
     suite signs in once (admin-setup) and shares that auth state (admin-tests). */
  projects: [
    {
      name: "live-site",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /[\\/]admin[\\/]/,
    },
    {
      name: "admin-setup",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /[\\/]admin[\\/]auth\.setup\.ts/,
    },
    {
      name: "admin-tests",
      use: {
        ...devices["Desktop Chrome"],
        storageState: adminStorageStatePath,
      },
      testMatch: /[\\/]admin[\\/].*\.spec\.ts/,
      dependencies: ["admin-setup"],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "dotnet run --project ../src/DancingGoat/DancingGoat.csproj",
    url: appBaseUrl,
    timeout: webServerTimeoutMs,
    reuseExistingServer: !isCi,
  },
});

import fs from "node:fs/promises";
import path from "node:path";
import { test } from "@playwright/test";
import { signInToAdmin } from "../../support/admin/auth";

const adminStorageStatePath = path.resolve(
  __dirname,
  "../../playwright/.auth/admin.json",
);

// Runs once as the `admin-setup` project (see playwright.config.ts) before the
// `admin-tests` project. It signs into the administration UI a single time and
// persists the resulting storage state to disk so every dependent admin spec
// starts already authenticated instead of repeating the sign-in flow.
test("authenticate admin and persist storage state", async ({ page }) => {
  await signInToAdmin(page);

  await fs.mkdir(path.dirname(adminStorageStatePath), { recursive: true });
  await page.context().storageState({ path: adminStorageStatePath });
});

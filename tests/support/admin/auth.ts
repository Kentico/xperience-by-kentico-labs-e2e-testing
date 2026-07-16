import { expect, type Locator, type Page } from "@playwright/test";
import {
  adminBaseUrl,
  adminDefaultPassword,
  adminDefaultUsername,
} from "../config";

// The built-in Xperience administration sign-in form is not owned by this
// codebase and its markup can shift between releases, so each field is matched
// against a small list of candidate selectors (most specific first) instead of a
// single brittle selector. See the admin selector policy in docs/Admin-E2E-Testing.md.
const usernameSelectors = [
  'input[name="username"]',
  'input[name="userName"]',
  'input[type="email"]',
  '[data-testid="username"] input',
];

const passwordSelectors = [
  'input[name="password"]',
  'input[type="password"]',
  '[data-testid="password"] input',
];

const submitSelectors = [
  'button[type="submit"]',
  'button:has-text("Sign in")',
  'button:has-text("Log in")',
  '[data-testid="signInButton"]',
];

// Landmarks that only render once the administration shell has loaded for an
// authenticated user. These are built-in Xperience applications available in
// every instance (including DancingGoat), so they double as a "signed in" probe.
const adminShellSelectors = [
  'a[aria-label="System"]',
  'a[aria-label="Content hub"]',
  'a[aria-label="Settings"]',
];

export async function signInToAdmin(page: Page): Promise<void> {
  await page.goto(adminBaseUrl);

  // Reusing stored auth state can land us on the shell already; skip sign-in.
  if (await hasAdminShell(page, 2_000)) {
    return;
  }

  const usernameInput = await waitForAnyVisible(page, usernameSelectors, 20_000);
  const passwordInput = await waitForAnyVisible(page, passwordSelectors, 20_000);

  await usernameInput.fill(adminDefaultUsername);
  await passwordInput.fill(adminDefaultPassword);

  const submitButton = await waitForAnyVisible(page, submitSelectors, 5_000);
  await submitButton.click();

  await expect
    .poll(
      async () => {
        if (await hasAdminShell(page, 1_000)) {
          return "ready";
        }

        const pathname = new URL(page.url()).pathname.toLowerCase();
        return pathname.includes("sign-in") || pathname.includes("signin")
          ? "sign-in"
          : "loading";
      },
      {
        timeout: 30_000,
        message: "Admin shell did not render after sign-in.",
      },
    )
    .toBe("ready");
}

async function hasAdminShell(page: Page, timeoutMs: number): Promise<boolean> {
  try {
    await waitForAnyVisible(page, adminShellSelectors, timeoutMs);
    return true;
  } catch {
    return false;
  }
}

async function waitForAnyVisible(
  page: Page,
  selectors: string[],
  timeoutMs: number,
): Promise<Locator> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      const count = await locator.count();

      if (count === 0) {
        continue;
      }

      try {
        await expect(locator).toBeVisible({ timeout: 500 });
        return locator;
      } catch {
        // Keep searching until the overall timeout elapses.
      }
    }

    await page.waitForTimeout(150);
  }

  throw new Error(
    `Unable to locate a visible selector from [${selectors.join(", ")}].`,
  );
}

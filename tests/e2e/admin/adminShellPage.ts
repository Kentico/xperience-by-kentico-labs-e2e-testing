import { expect, type Page } from "@playwright/test";
import { adminBaseUrl } from "../shared/config";

// Page object for the top-level Xperience administration shell (the frame that
// hosts the application navigation and dashboard). Keeping selectors for the
// built-in admin UI behind a page object means a Kentico upgrade that shifts
// this markup can be fixed in one place instead of across every admin spec.
export class AdminShellPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(adminBaseUrl);
  }

  async expectSignedIn(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin/i);

    // The sign-in route lives under /admin, so an authenticated shell is only
    // proven by the absence of the sign-in path plus a rendered app landmark.
    await expect
      .poll(async () => this.page.url().toLowerCase().includes("sign-in"))
      .toBeFalsy();

    // "System" is a built-in application present in every Xperience instance and
    // is the landmark proven stable by the Kentico Community Portal admin suite.
    await expect(
      this.page.locator('a[aria-label="System"]'),
    ).toBeVisible({ timeout: 15_000 });
  }
}

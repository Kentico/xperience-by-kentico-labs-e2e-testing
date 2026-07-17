import { expect, type Locator, type Page } from "@playwright/test";
import { adminBaseUrl } from "../shared/config";

// Route of the custom UI page registered by the DancingGoat.Admin sample. The
// [UIApplication] attribute on CustomTemplate.cs registers it under
// "CustomTemplate", so the shell serves it at <admin>/CustomTemplate.
const customTemplatePath = `${adminBaseUrl.replace(/\/$/, "")}/CustomTemplate`;

// Default label rendered by CustomLayoutTemplate.tsx before any command runs.
// It is supplied server-side by CustomTemplate.ConfigureTemplateProperties.
export const defaultLabel = "Click the button to get server time.";

// Page object for the custom UI page backed by the React template
// (src/DancingGoat.Admin/Client/src/custom-layout/CustomLayoutTemplate.tsx).
//
// This page is code we own in this repository, but the surrounding admin shell
// and the "@kentico/xperience-admin-components" Button it renders are not, so we
// still lean on semantic role/label selectors per docs/Admin-E2E-Testing.md.
export class CustomTemplatePage {
  constructor(private readonly page: Page) {}

  // Locators are exposed as getters rather than fields: `page` is a constructor
  // parameter property, so a field initializer referencing `this.page` would run
  // before it is assigned (TS2729). Getters resolve lazily, when first used.

  // The React template renders the label into the single <h1>.
  private get heading(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  // The Kentico <Button label="Get server time"> surfaces its label as the
  // button's accessible name, so a role/name selector is stable across releases.
  private get getServerTimeButton(): Locator {
    return this.page.getByRole("button", { name: "Get server time" });
  }

  // Navigate straight to the custom application's route.
  async goto(): Promise<void> {
    await this.page.goto(customTemplatePath);
    await expect(this.heading).toBeVisible({ timeout: 15_000 });
  }

  // Navigate the way a user would: open the "Custom" application category in the
  // left navigation, then follow the "CustomApp" tile. Exercises that the custom
  // module (AcmeWebAdminModule) surfaces its UICategory and UIApplication in the
  // shell, not just that the route renders.
  async gotoViaNavigation(): Promise<void> {
    await this.page.goto(adminBaseUrl);

    await this.page.locator('button[aria-label="Custom"]').click();

    await this.page
      .locator('a[href$="/admin/CustomTemplate"]')
      .filter({ hasText: "CustomApp" })
      .first()
      .click();

    await expect(this.page).toHaveURL(/\/admin\/CustomTemplate$/i);
    await expect(this.heading).toBeVisible({ timeout: 15_000 });
  }

  async headingText(): Promise<string> {
    return (await this.heading.innerText()).trim();
  }

  async expectDefaultLabel(): Promise<void> {
    await expect(this.heading).toHaveText(defaultLabel);
  }

  async clickGetServerTime(): Promise<void> {
    await this.getServerTimeButton.click();
  }

  // After the SetLabel page command returns, the template replaces the label
  // with DateTime.Now.ToString(). We do not assert an exact value (it changes
  // every run and its format follows the server culture); instead we require the
  // label to leave its default and expose a time component (HH:MM), which the
  // command's DateTime string always contains.
  async expectServerTimeLabel(): Promise<void> {
    await expect(this.heading).not.toHaveText(defaultLabel);
    await expect(this.heading).toHaveText(/\d{1,2}:\d{2}/);
  }
}

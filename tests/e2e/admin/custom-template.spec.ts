import { expect, test } from "@playwright/test";
import { CustomTemplatePage, defaultLabel } from "./customTemplatePage";

// End-to-end coverage for the custom UI page template that ships with the
// DancingGoat.Admin sample:
//   - backend page:     src/DancingGoat.Admin/UIPages/CustomTemplate/CustomTemplate.cs
//   - React template:   src/DancingGoat.Admin/Client/src/custom-layout/CustomLayoutTemplate.tsx
//   - app registration: src/DancingGoat.Admin/AcmeWebAdminModule.cs
//
// These tests demonstrate the pattern for verifying an admin UI extension that
// combines a custom application, a UI page, and a React layout component wired to
// a server-side [PageCommand]. They run under the `admin-tests` project, which
// reuses the storage state captured by `admin-setup`, so each test starts already
// authenticated.
test.describe("custom UI page template", () => {
  test("surfaces the custom application in the shell navigation", async ({
    page,
  }) => {
    const customTemplate = new CustomTemplatePage(page);

    // Reaching the page through the "Custom" category flyout proves the custom
    // module's UICategory + UIApplication rendered in the shell, not merely that
    // the route resolves.
    await customTemplate.gotoViaNavigation();
    await customTemplate.expectDefaultLabel();
  });

  test("renders the server-provided default label", async ({ page }) => {
    const customTemplate = new CustomTemplatePage(page);

    await customTemplate.goto();

    // The label comes from CustomTemplate.ConfigureTemplateProperties on the
    // server and is the initial state of the React component's useState.
    await customTemplate.expectDefaultLabel();
  });

  test("updates the label with the server time via the page command", async ({
    page,
  }) => {
    const customTemplate = new CustomTemplatePage(page);

    await customTemplate.goto();
    await customTemplate.expectDefaultLabel();

    // Clicking the Kentico Button triggers usePageCommand("SetLabel"), which
    // calls the [PageCommand] SetLabel() returning DateTime.Now. The template's
    // `after` callback then swaps the heading text to that value.
    await customTemplate.clickGetServerTime();

    await customTemplate.expectServerTimeLabel();

    // Sanity-check the round trip produced a genuinely new value distinct from
    // the seed label.
    const updated = await customTemplate.headingText();
    expect(updated).not.toBe(defaultLabel);
  });
});

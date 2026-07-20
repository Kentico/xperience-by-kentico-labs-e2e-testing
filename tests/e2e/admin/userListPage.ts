import { expect, type Locator, type Page } from "@playwright/test";
import { adminBaseUrl } from "../shared/config";

// Route of the built-in Users application. The listing redirects to
// /admin/users/list once loaded.
const userListPath = `${adminBaseUrl.replace(/\/$/, "")}/users`;

// Reverses a string character-by-character, mirroring the server-side
// UserListExtender.ReverseName behaviour so the test can assert the outcome
// without hard-coding a value that flips every run.
const reverse = (value: string): string => [...value].reverse().join("");

// Page object for the built-in Users listing as customized by UserListExtender
// (src/DancingGoat.Admin/UIPages/UserListExtender/UserListExtender.cs): the
// LastName column is relabelled "Custom last name" and a per-row "Reverse last
// name" action is added.
//
// The listing is a div-based ARIA grid, not a native <table>, so we lean on the
// field-bound data-testid values Kentico renders (captured during discovery) and
// on scoped role locators. See docs/Admin-E2E-Testing.md for the selector policy.
export class UserListPage {
  constructor(private readonly page: Page) {}

  private get grid(): Locator {
    return this.page.getByTestId("table");
  }

  private get customLastNameHeader(): Locator {
    return this.page.getByRole("columnheader", { name: "Custom last name" });
  }

  private get firstRow(): Locator {
    return this.page.getByTestId("table-row").first();
  }

  // The last-name cell keeps its field-bound test id even though the column
  // header was relabelled to "Custom last name".
  private get firstRowLastNameCell(): Locator {
    return this.page.getByTestId("table-cell-LastName").first();
  }

  async goto(): Promise<void> {
    await this.page.goto(userListPath);
    await expect(this.grid).toBeVisible({ timeout: 15_000 });
  }

  // Proves the extender's ConfigurePage ran: it renamed the LastName column.
  async expectCustomColumn(): Promise<void> {
    await expect(this.customLastNameHeader).toBeVisible();
  }

  async firstRowLastName(): Promise<string> {
    return (await this.firstRowLastNameCell.innerText()).trim();
  }

  // Opens the first row's 3-dot action menu and invokes "Reverse last name".
  // The click is scoped to the open action-menu popup on purpose: the page
  // header carries a *bulk* button with the identical accessible name
  // ("Reverse last name") that would reverse every user, so an unscoped locator
  // is both ambiguous (strict-mode) and wrong.
  async reverseFirstRowLastName(): Promise<void> {
    await this.firstRow.getByTestId("button-action-menu").click();

    await this.page
      .getByTestId("action-menu")
      .getByRole("button", { name: "Reverse last name" })
      .click();
  }

  // The row reloads a beat after the command returns RowActionResult(reload:true);
  // toHaveText retries, covering that async gap.
  async expectFirstRowLastNameReversedFrom(before: string): Promise<void> {
    await expect(this.firstRowLastNameCell).toHaveText(reverse(before));
  }
}

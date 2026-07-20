import { test } from "@playwright/test";
import { UserListPage } from "./userListPage";

// Generated from tests/e2e/scenarios/users-reverse-last-name.e2e.md.
//
// Verifies the custom per-row "Reverse last name" action that UserListExtender
// adds to the built-in Users listing:
//   - extender:  src/DancingGoat.Admin/UIPages/UserListExtender/UserListExtender.cs
//
// Runs under the `admin-tests` project, which reuses the storage state captured
// by `admin-setup`, so the test starts already authenticated.
test.describe("users listing — reverse last name row action", () => {
  test("reverses the first user's last name via the row action", async ({
    page,
  }) => {
    const userList = new UserListPage(page);

    await userList.goto();

    // The relabelled column proves the page extender is active before we act.
    await userList.expectCustomColumn();

    // The stored LastName toggles between a value and its reverse on every run,
    // so capture it first and assert the post-action value is its character
    // reverse rather than a hard-coded string.
    const before = await userList.firstRowLastName();

    await userList.reverseFirstRowLastName();

    await userList.expectFirstRowLastNameReversedFrom(before);
  });
});

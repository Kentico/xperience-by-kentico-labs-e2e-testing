# E2E context: Users list "Reverse last name" row action

- **Status:** Complete
- **Surface:** Administration UI
- **Discovered:** 2026-07-20 against `DancingGoat` at `http://localhost:21295/admin`
- **Suggested spec location:** `tests/e2e/admin/users-reverse-last-name.spec.ts` (admin slice; add a `userListPage.ts` page object alongside `customTemplatePage.ts`)

## Goal

Verify the custom per-row **Reverse last name** action added to the built-in
Users listing by `UserListExtender`. Opening the row's 3-dot action menu and
choosing "Reverse last name" runs the server `[PageCommand] ReverseName(int id)`,
which reverses the user's `LastName` character-by-character, persists it, and
reloads the row. A passing test proves the row action is wired to the command
and the grid reflects the updated value.

Backing code:
- `src/DancingGoat.Admin/UIPages/UserListExtender/UserListExtender.cs` — the
  `PageExtender<UserList>` that removes the default `LastName` column, re-adds it
  under the label **"Custom last name"**, and registers the row command
  `ReverseName` (label "Reverse last name", icon `ArrowsCrooked`).

## Preconditions

- **Authentication:** Signed in as `administrator`. Under the `admin-tests`
  project this comes from the `admin-setup` storage state, so the test starts
  authenticated (same as `custom-template.spec.ts`). Credentials come from
  `tests/e2e/shared/config.ts` (`adminDefaultUsername` / `adminDefaultPassword`,
  default `administrator` / `Pass@12345`).
- **Seed data:** The DancingGoat DB seeds exactly one user, `administrator`, so
  the listing always has ≥1 row (scenario step 3 is satisfied by the seed). No
  need to create a user.
- **Feature flags / config:** None. The extender is registered via
  `[assembly: PageExtender(typeof(UserListExtender))]` and is always active. The
  admin client must be built (embedded mode) for the app to run, but this is a
  built-in listing page, not a custom React page, so no `Client/dist` dependency
  for the grid itself.

## Walkthrough

### Step 1 — Open the Users listing

- **Navigate:** `page.goto(\`${adminBaseUrl}/users\`)` → resolves to
  `/admin/users/list`.
- **Target element:** The listing grid.
- **Selector:** wait on the grid `page.getByTestId("table")` (role `table`) or on
  the "Custom last name" column header
  `page.getByRole("columnheader", { name: "Custom last name" })`.
- **Data submitted:** none.
- **Result / assertion hint:** The grid renders one row for `administrator`. The
  renamed column header reads **"Custom last name"** (proves the extender's
  `ConfigurePage` ran). There is an **Actions** column on the far right.

### Step 2 — Read the first row's current last-name value

- **Target element:** The first row's last-name cell.
- **Selector:** `page.getByTestId("table-cell-LastName").first()` — the cell keeps
  the field-bound test id `table-cell-LastName` even though its header label was
  changed to "Custom last name". Fallback: the first
  `[role="row"] [role="cell"]` under the LastName column.
- **Data submitted:** none.
- **Result / assertion hint:** Capture `before = (await cell.innerText()).trim()`.
  **Do not hard-code the value** — see Dynamic values below. Observed at discovery
  time it was `rotartsinimdA` (a previous run had already reversed
  `Administrator`).

### Step 3 — Open the row's 3-dot action menu

- **Target element:** The 3-dot context-menu button at the end of the first row,
  in the Actions column.
- **Selector:** `row.getByTestId("button-action-menu")` — scope to the first row
  (`page.getByTestId("table-row").first()`). The button exposes
  `aria-expanded` which flips to `true` when open. Fallback: the row also has a
  disabled `data-testid="button-Delete"`; do not confuse them.
- **Data submitted:** none.
- **Result / assertion hint:** A popup action menu (`data-testid="action-menu"`)
  appears containing the "Reverse last name" item.

### Step 4 — Choose "Reverse last name" and trigger the command

- **Target element:** The "Reverse last name" menu item inside the opened action
  menu.
- **Selector:** scope to the menu, then pick the item:
  `page.getByTestId("action-menu").getByRole("button", { name: "Reverse last name" })`.
  The item is a `div[role="button"][data-testid="menu-item"]` whose text/accessible
  name is "Reverse last name". **Scoping to `action-menu` is required** — the page
  header also has a bulk button with the identical accessible name "Reverse last
  name" (`data-testid="ReverseNameBulk"`), which reverses *all* users. An unscoped
  `getByRole("button", { name: "Reverse last name" })` is ambiguous (strict-mode
  violation) and could hit the wrong action.
- **Data submitted:** none (the command receives the row `id` server-side).
- **Result / assertion hint:** `ReverseName` returns `RowActionResult(reload: true)`
  and a success message `"Reversed the name of administrator"`. The grid reloads
  the row and the last-name cell now shows the reversed string.

### Step 5 — Verify the last-name value was reversed

- **Target element:** The same first-row last-name cell.
- **Selector:** `page.getByTestId("table-cell-LastName").first()`.
- **Result / assertion hint:** Assert the value is the character-reverse of the
  captured `before` value:
  `await expect(cell).toHaveText([...before].reverse().join(""))`.
  Observed transition at discovery: `rotartsinimdA` → `Administrator`.
  Playwright auto-waits/retries the `toHaveText` assertion, covering the async
  reload after the command.

## Dynamic & non-deterministic values

- **Last-name cell value** → do **not** hard-assert `Administrator` or
  `rotartsinimdA`. The stored `LastName` is mutated in place and toggles between
  the two on each run, so the value depends on prior test/app state. Read the
  value before the action and assert the post-action value equals its character
  reverse (`[...before].reverse().join("")`). Both are equal-length, so any
  starting value works.
- **Success toast** (`"Reversed the name of administrator"`) → auto-dismisses
  quickly; it was already gone by the time the DOM settled during discovery.
  Assert on the cell value change, not on the toast (a `waitFor` on the toast text
  timed out during discovery).

## Gotchas observed

- **The grid is NOT a native `<table>`.** It is a div-based grid with ARIA roles.
  Native `document.querySelector('table'|'th'|'tr')` returns nothing; Playwright
  role locators (`table`, `row`, `columnheader`, `cell`) and the `data-testid`s
  below work. There is **no iframe and no shadow DOM** on this listing.
- **No separate "Last name" column exists.** The scenario mentions recording both
  "Last name" and "Custom last name", but the extender *removes* the default
  `LastName` column and re-adds the same `LastName` field under the label
  "Custom last name". So the row has a single last-name cell
  (`data-testid="table-cell-LastName"`, header "Custom last name") — treat "Last
  name" and "Custom last name" as the same value.
- **Two elements share the accessible name "Reverse last name."** The row
  action-menu item and the page-header **bulk** button (`ReverseNameBulk`, which
  reverses every user). Always scope the row action to
  `getByTestId("action-menu")`. Header actions on this page are: "NEW USER" link,
  "DASHBOARD" link, and the "Reverse last name" bulk button.
- **Async reload after the command.** The row reloads a beat after the click;
  rely on Playwright's retrying `toHaveText` rather than reading the value once.
- **Stable test ids captured** (from the running DOM):
  `data-testid="table"` (grid), `="table-row"` (row), `="table-cell-LastName"`
  (last-name cell), `="button-action-menu"` (row 3-dot), `="action-menu"` (open
  menu container), `="menu-item"` (menu item), `="ReverseNameBulk"` (header bulk
  button — avoid for the row scenario), `="button-Delete"` (disabled row delete).

## Open questions / gaps

None — scenario completed end to end. Verified the row's last-name value changed
from `rotartsinimdA` to `Administrator` after invoking the row action.

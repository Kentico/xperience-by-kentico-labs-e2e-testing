---
name: e2e-test-generator
description: Turn a scenario context document (produced by e2e-test-context-discovery) into a passing Playwright E2E test, placed in the right vertical-slice folder, validated against the running app, then reviewed for coverage.
argument-hint: Name of the scenario context document (e.g. users-reverse-last-name.e2e.md).
context: fork
metadata:
  - skill-type: test-generation
user-invocable: true
---

You take a **scenario context document** — the technical walkthrough
`e2e-test-context-discovery` writes to `tests/e2e/scenarios/[SCENARIO].e2e.md` —
and turn it into a **passing** Playwright test committed to the right
vertical-slice folder. The context doc was already validated against the running
app, so its selectors, data, and assertion hints are trustworthy: translate them,
don't re-discover them.

Run every command from the repository root
(`xperience-by-kentico-labs-e2e-testing/`); file references in prose
(`tests/e2e/…`, `src/DancingGoat…`) are repo-root-relative and doc cross-links are
relative to this file. The validation harness is
`npx playwright test <spec>` from `tests/` — there is no separate driver.

## 0. Require the scenario context document

This skill's input is the name of a context document.
**If none was supplied as an argument or the file could not be found in the tests/e2e/scenarios/ folder,
stop and ask for one** (or run `e2e-test-context-discovery` first).

Read it in full before writing any code — it defines the goal, preconditions, per-step
selectors/data, dynamic values to avoid hard-asserting, and gotchas. If its
**Status** is `Blocked`, stop and tell the user the scenario was never completed;
do not invent the missing steps.

## 1. Place the test by persona + feature (vertical slice)

Tests live in **feature slices** under `tests/e2e/` so a developer working on one
feature finds its spec, page objects, and helpers in a single folder — never
scattered. Put the new test with the slice that matches the scenario's **persona
and feature**, honouring the doc's _Suggested spec location_:

| Persona                                   | Feature examples                                    | Slice folder                             | Playwright project                        |
| ----------------------------------------- | --------------------------------------------------- | ---------------------------------------- | ----------------------------------------- |
| Administrator (extends/uses the admin UI) | custom apps, UI pages, page extenders, Page Builder | `tests/e2e/admin/`                       | `admin-tests` (reuses `admin-setup` auth) |
| Website visitor / member                  | registration, sign-in, membership                   | `tests/e2e/membership/` (or a new slice) | `live-site`                               |

For a brand-new feature area create a new slice folder (e.g.
`tests/e2e/checkout/`) holding its own spec + support code. Colocate any page
object/helper you create with the spec in the same slice. See
[docs/Admin-E2E-Testing.md](docs/Admin-E2E-Testing.md#how-it-is-organized).

## 2. Translate the document into readable Playwright code

Work step by step through the doc's **Walkthrough**, turning each step into
Playwright:

- **Navigation** → `page.goto(...)` (derive admin routes from `adminBaseUrl` in
  `tests/e2e/shared/config.ts`, as `customTemplatePage.ts` does) or the documented
  click path.
- **Selectors** → use the locator the doc recorded, following the repo selector
  policy (role/label/text → `data-testid` fallback). Keep the documented scoping
  (e.g. scope a row action to its menu container) and fallbacks.
- **Actions/events** → `click` / `fill` / `press`. Prefer Playwright's
  auto-waiting locators over fixed `delay`s.
- **Assertions** → use the doc's _assertion hints_ and honour **Dynamic &
  non-deterministic values**: assert the _shape_ or a _derived_ value (read a
  value, act, assert the transform) instead of hard-coding volatile strings. Lean
  on retrying assertions (`toHaveText`, `toBeVisible`) to cover async updates.

Organize the whole scenario into **one coherent test** inside a
`test.describe(...)`. Push fragile selectors and multi-step interactions behind a
**page object** in the slice (mirror `customTemplatePage.ts`: constructor takes
`Page`, locators are getters — a field initializer referencing `this.page` fails
with TS2729 — and methods read as intent). Add a small **reusable utility** only
when it improves readability (e.g. the character-reverse helper in
`userListPage.ts`), not speculatively.

**Worked example (generated this way, passing):** from
`tests/e2e/scenarios/users-reverse-last-name.e2e.md` →
`tests/e2e/admin/userListPage.ts` + `tests/e2e/admin/users-reverse-last-name.spec.ts`.

## 3. Validate the test passes (iterate ≤ 3×)

Playwright's `webServer` starts the app automatically, but the **admin UI is
served in embedded mode** — build the admin client first or custom admin pages
might not work correctly (a stale `Client/dist` looks exactly like a broken selector):

```bash
# Admin scenarios only: build the embedded client before running tests
cd src/DancingGoat.Admin/Client && npm i && npm run build && cd ../../..
```

Run just the new spec (admin slice example — `admin-setup` provides auth):

```bash
cd tests
npx playwright test users-reverse-last-name --project=admin-setup --project=admin-tests
```

For a live-site scenario, use `--project=live-site` instead. Expected output:

```
  ✓  [admin-setup] › … authenticate admin and persist storage state
  ✓  [admin-tests] › … reverses the first user's last name via the row action
  2 passed
```

If it fails, **iterate up to 3 times**: read the failure (trace/screenshot land in
`tests/test-results/`), fix the spec/page object against the doc, re-run. The doc
is authoritative for _what_ the app does — a persistent failure usually means the
translation is wrong (selector scope, timing, a hard-coded dynamic value), not the
scenario. **If it still fails after 3 attempts, stop and report** the failure and
what you tried; do not weaken assertions just to go green.

## 4. Review and suggest improvements

Once green, review the test against the context doc and give the user **exactly 3
concrete suggestions**, each either:

- **Coverage** — a missing scenario worth adding (negative/error path, empty
  state, permissions, a second persona, an edge case the doc's _Open questions_
  or _Gotchas_ hint at), or
- **Simplification** — where the test is over-prescriptive (asserting incidental
  DOM detail, brittle selectors that could be role/label, redundant steps) and
  should assert intent instead.

Name the specific file/line and the change for each. Then point the user at the
generated files for review.

## Gotchas

- **Embedded admin client.** For any admin scenario, `npm run build` in
  `src/DancingGoat.Admin/Client` must precede the test run (Playwright's
  `webServer` `dotnet run` embeds `Client/dist` at build time). Skipping it makes
  custom admin pages render empty and the test fail on a missing element.
- **Locator getters, not fields.** In a page object, `private readonly x = this.page.getByRole(...)`
  fails to compile (TS2729 — `page` is a constructor
  parameter property). Use `private get x() { return this.page… }`, as
  `customTemplatePage.ts` / `userListPage.ts` do.
- **Don't hard-assert dynamic values.** Values the doc flags as volatile
  (timestamps, in-place-mutated fields, generated ids, localized formats) must be
  asserted by shape or derivation, or the test passes once and fails the next run.
- **Scope ambiguous names.** When the doc warns two elements share an accessible
  name (e.g. a row action vs a header bulk button), keep its scoping — an unscoped
  `getByRole` throws a strict-mode violation or hits the wrong control.
- **Kentico grids aren't native tables.** `data-testid` role locators work;
  `querySelector('table'|'tr')` returns nothing. Trust the doc's captured test ids.

## Troubleshooting

- **`element(s) not found` on a custom admin page** or 500 errors when running the admin:
  the embedded client wasn't built — run the `npm run build` step in section 3, then re-run. To diagnose issues with admin UI extension, see [Diagnosing Xperience by Kentico Admin UI Extension Issues](https://community.kentico.com/blog/diagnosing-xperience-by-kentico-admin-ui-extension-issues).
- **Test hangs waiting for the web server**: first `dotnet run` build is slow;
  raise the budget with `PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS=300000` before the
  `npx playwright test` command.
- **`strict mode violation: locator resolved to N elements`**: the locator is
  under-scoped — apply the scoping the context doc documented.

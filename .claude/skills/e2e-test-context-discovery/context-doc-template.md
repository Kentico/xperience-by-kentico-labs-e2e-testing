<!--
  Template for the [SCENARIO].e2e.md context document produced by the
  e2e-test-context-discovery skill. Copy this structure, fill every section
  from what you actually observed while driving the app, and delete the HTML
  comments. A downstream agent uses this file (and nothing else) to write the
  Playwright test, so record real selectors and real data — never guesses.
-->

# E2E context: <scenario title>

- **Status:** Complete | Blocked (see [Open questions](#open-questions--gaps))
- **Surface:** Administration UI | Public website
- **Discovered:** <YYYY-MM-DD> against `<project>` at `<base URL>`
- **Suggested spec location:** `tests/e2e/<slice>/<name>.spec.ts`

## Goal

<One or two sentences: what the user is trying to accomplish and what a passing
test proves. Restate the scenario in your own words.>

## Preconditions

<Everything that must be true before step 1. Be specific.>

- **Authentication:** <e.g. signed in as `administrator` via the admin-setup
  storage state, or an anonymous visitor>
- **Seed data:** <content items, members, products the scenario depends on —
  name them, and note whether the test must create them>
- **Feature flags / config:** <anything that gates the UI being present>

## Walkthrough

<One subsection per step. Each step is a single user action and its result.
"Selector" is the exact locator to use, chosen per the repository selector
policy (docs/Admin-E2E-Testing.md) — record WHY, and prefer Playwright role/
label locators. Include the fallback you would use behind a page object.>

### Step 1 — <intent, e.g. "Open the custom application">

- **Navigate:** <URL to `goto`, or the click path that gets there>
- **Target element:** <human description, e.g. "the Custom category in the left nav">
- **Selector:** `<locator>` — <rationale / priority tier>
- **Data submitted:** <field → value, or "none">
- **Result / assertion hint:** <what changes in the DOM that the test asserts>

### Step 2 — <intent>

- ...

## Dynamic & non-deterministic values

<Anything the test must NOT hard-assert: timestamps, generated IDs, localized
formats, values that change per run. State the shape/regex to assert instead.>

- <value> → assert <shape>, not an exact string.

## Gotchas observed

<Real traps you hit while driving. Overlays that intercept clicks, iframes,
shadow DOM, elements that only render after an async command, etc. Omit if none.>

- <trap> → <how to handle it in the test>

## Open questions / gaps

<Fill this ONLY if Status is Blocked. What information was missing, what step
could not be completed, and what you need from the user to finish. If the
scenario completed fully, write "None — scenario completed end to end.">

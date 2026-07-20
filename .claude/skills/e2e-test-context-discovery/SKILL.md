---
name: e2e-test-context-discovery
description: Explore a described administration-UI or public-website scenario in this project's Xperience by Kentico app by driving it with the Chrome DevTools MCP server, then record the navigation, selectors, and data into a scenario context document for a future Playwright E2E test. Use when capturing how a scenario works before its test is written, or as the first step feeding e2e-test-generator.
argument-hint: The scenario to explore (e.g. 'member registration', 'create a new product', 'edit a page in Page Builder'). Include the goal and rough path through web pages and UI elements.
context: fork
compatibility:
  - io.github.ChromeDevTools/chrome-devtools-mcp
metadata:
  - skill-type: context-discovery
user-invocable: true
---

Given a user-described interaction scenario (admin UI or public website), you
**drive the running app** with the **Chrome DevTools MCP server**, complete the
whole workflow yourself, and write down the technical details a test author
needs — real selectors, navigation, and data — into a review document. You do
**not** write the Playwright test; you produce the context for it.

Run every command from the repository root
(`xperience-by-kentico-labs-e2e-testing/`). File references in prose
(`tests/e2e/…`, `src/DancingGoat…`) and `<PROJECT_ROOT>/…` doc links are all
relative to the repository root — `<PROJECT_ROOT>` stands in for it so the paths
do not depend on where this skill file lives. The harness is the Chrome
DevTools MCP tools (`io.github.ChromeDevTools/chrome-devtools-mcp`) —
there is no driver script; the tool loop in
[Discover the scenario](#4-discover-the-scenario-the-mcp-loop) is the harness.

## 0. Confirm Chrome DevTools MCP access first

This skill cannot work without the Chrome DevTools MCP server — it is the only
way it drives the app. **Before anything else, confirm the
Chrome DevTools MCP server tools are available**
(they may be deferred — load them with a ToolSearch such as
`select:io.github.ChromeDevTools/chrome-devtools-mcp__navigate_page,io.github.ChromeDevTools/chrome-devtools-mcp__take_snapshot`).

If those tools are not available (the server is not connected or the ToolSearch
returns no match), **stop immediately and report the requirement to the user** —
do not start the app, and do not attempt to substitute another browser tool.
Tell them the skill requires the Chrome DevTools MCP server to be configured and
connected, then end.

## 1. Require a scenario

This skill needs a scenario from the user describing the pages to visit and the
elements to interact with. If none was given, **ask for it before doing anything
else.** The scenario need not include exact selectors or field values — finding
those is the whole point — but it must name the goal and the rough path.

## 2. Prerequisites & running the project

The app is `src/DancingGoat` (+ `src/DancingGoat.Admin`). It serves the public
site at `http://localhost:21295` and the admin UI at `/admin`. Full setup —
database, license, .NET/Node versions — is in
[docs/Contributing-Setup.md](<PROJECT_ROOT>/docs/Contributing-Setup.md) and
[docs/Admin-E2E-Testing.md](<PROJECT_ROOT>/docs/Admin-E2E-Testing.md). A database must
already exist.

**The admin UI is served in embedded mode**, so the React admin client
(`src/DancingGoat.Admin/Client`) must be compiled **before** the app is built/run
or custom admin pages render nothing. Build it first (verified commands):

```bash
# 1. Build the admin client assets (embedded into the assembly at .NET build time)
cd src/DancingGoat.Admin/Client
npm ci
npm run build            # webpack --mode=production → Client/dist

# 2. Run the app from the repo root
cd ../../..
dotnet run --project src/DancingGoat/DancingGoat.csproj
```

## 3. Confirm the app is reachable — or stop

Poll the URL before driving. **If the app cannot be started or reached, stop and
report the failure to the user** (with the `dotnet run` output) — do not
fabricate selectors.

```bash
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:21295/admin --max-time 5)
  [ "$code" != "000" ] && { echo "UP: HTTP $code"; break; }
  sleep 3
done
```

## 4. Discover the scenario (the MCP loop)

Drive the app with the Chrome DevTools MCP tools. The loop is: **navigate →
snapshot → inspect the DOM for a stable selector → act → verify**. Take a
snapshot after every navigation/click, because element `uid`s are reassigned per
snapshot — always act on `uid`s from the latest one.

For the **admin UI**, sign in first (default creds `administrator` / `Pass@12345`
from `tests/e2e/shared/config.ts`): `navigate_page` to `/admin`, `take_snapshot`,
`fill` the user-name and password textboxes, `click` **Sign in**.

Core tools:

| Tool              | Use                                                              |
| ----------------- | ---------------------------------------------------------------- |
| `navigate_page`   | Go to a URL (`/admin`, a route, a page path).                    |
| `take_snapshot`   | Accessibility tree with `uid`s + roles/names — your primary map. |
| `click` / `fill`  | Act on an element by `uid` from the latest snapshot.             |
| `evaluate_script` | Read real DOM attributes to pick a stable selector (below).      |
| `take_screenshot` | Capture proof / visual state (`filePath` to save).               |

The snapshot gives roles and accessible names (usually enough for a locator).
When you need the actual attributes behind an element to choose the best
selector, read them directly — this is the key step that turns exploration into
a usable selector:

```js
// evaluate_script — dump candidate selectors for elements matching some text
() => {
  const pick = (el) =>
    el && {
      tag: el.tagName,
      aria: el.getAttribute("aria-label"),
      testid: el.getAttribute("data-testid"),
      href: el.getAttribute("href"),
      id: el.id,
      role: el.getAttribute("role"),
      text: el.textContent.trim().slice(0, 40),
    };
  return [...document.querySelectorAll("button, a, h1, input")]
    .filter((el) =>
      /YOUR TEXT/i.test(el.textContent || el.getAttribute("aria-label") || ""),
    )
    .map(pick);
};
```

Choose selectors per the repository **selector policy**
([docs/Admin-E2E-Testing.md](<PROJECT_ROOT>/docs/Admin-E2E-Testing.md#selector-policy-for-the-admin-ui)):
ARIA role/name → label → stable text → `data-testid` (fallback) for built-in UI;
for components owned in this repo an intentional `data-testid` is fine. Record
both the chosen locator and a fallback.

Complete the **entire** scenario end to end — every navigation, form fill, and
submit the user described — verifying each result in a fresh snapshot before
moving on.

## 5. Record the context document

Write findings to **`tests/e2e/scenarios/[SCENARIO].e2e.md`** by default (slugify the
scenario for the filename, e.g. `member-registration.e2e.md`). Copy
[context-doc-template.md](context-doc-template.md) and fill every section from
what you observed — real selectors, real data, real assertion hints. This file
is the sole input for the test-writing agent, so do not guess: if you did not
observe it, it does not go in.

## 6. Stop conditions & reporting

- **Chrome DevTools MCP server unavailable** → stop before starting the app and
  report that the skill requires it (see step 0).
- **App unreachable** → stop, report the startup/access error to the user, and
  do not write a selector-bearing document.
- **Not enough context** (a step is ambiguous, required data is unknown, or the
  goal can't be reached) → stop, record what you _did_ complete in the
  `.e2e.md` file, set its **Status** to `Blocked`, fill **Open questions /
  gaps**, and tell the user exactly what's missing to continue.
- **Scenario completed** → save the document, set **Status** to `Complete`, and
  point the user at the file for review.

## Gotchas

- **Client not built → blank custom admin pages.** In embedded mode a stale or
  missing `Client/dist` means custom admin apps render no content (no `<h1>`,
  etc.) and you'll mistake it for a bad selector. Always run
  `npm run build` in `src/DancingGoat.Admin/Client` before the app, and after any
  `.tsx` change. This is the same root cause that broke CI.
- **`uid`s are per-snapshot.** A `uid` from an earlier snapshot may point at the
  wrong element or fail after navigation. Re-`take_snapshot` before each action.
- **Nav flyout overlays the content.** Opening a category flyout (e.g. "Custom")
  covers the page; a `click` on a now-covered element times out
  ("did not become interactive"). Navigate via the flyout link (which dismisses
  it) or go straight to the route, then act.
- **Kentico `<Button label="X">` exposes its label as the accessible name**, so
  `getByRole("button", { name: "X" })` is stable — its `data-testid` is often a
  generic `"button"` and not worth using.
- **Async page commands.** After a `click` that triggers a server command, the
  DOM updates a beat later — verify with a fresh snapshot/`evaluate_script`, and
  record the value's _shape_ (e.g. a localized `DateTime` → `/\d{1,2}:\d{2}/`),
  not an exact string, in the document.
- **Page Builder canvas** is a same-origin `iframe[title="Page builder"]`; reach
  into it with a frame locator. Kentico web components expose open shadow roots
  that Playwright pierces automatically — note this for the test author.

## Troubleshooting

- **`take_screenshot`/`take_snapshot` returns the sign-in page** for admin
  scenarios: the session isn't authenticated — run the sign-in sequence in step 4
  first.
- **`curl` returns `000` indefinitely**: the app didn't start. Check the
  `dotnet run` output for a DB connection or license error and report it; see
  [docs/Contributing-Setup.md](<PROJECT_ROOT>/docs/Contributing-Setup.md).

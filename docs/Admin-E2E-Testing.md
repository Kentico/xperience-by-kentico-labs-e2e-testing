# Admin UI E2E Testing

This project demonstrates end-to-end (E2E) testing of the **Xperience by Kentico
administration interface** with [Playwright](https://playwright.dev), alongside
the existing live-site membership tests.

The goal is to give developers and agents a working example for testing
extensions to the admin experience — custom applications, UI pages, page
extenders, and components — as well as the Page Builder experience for marketers
(widgets, sections, page templates).

Kentico explicitly supports automated UI testing of the administration interface
with Playwright or Cypress. See the official guidance:
[Administration interface UI tests](https://docs.kentico.com/documentation/developers-and-admins/customization/extend-the-administration-interface/administration-interface-ui-tests).

## How it is organized

Tests follow a **vertical-slice** layout: each feature folder under `e2e/`
holds everything for that feature — specs, page objects, helpers, and setup —
so you never have to scan a parallel `support/` tree. Only genuinely
feature-agnostic code lives in `e2e/shared/`.

```
tests/
  playwright.config.ts              # live-site + admin-setup + admin-tests projects
  e2e/
    shared/
      config.ts                     # environment contract: base URLs, admin creds, timeouts
    membership/                      # live-site membership slice
      emailClient.ts                # MCP email client (Virtual Inbox)
      registration.spec.ts          # register → confirm email → sign in
    admin/                           # administration UI slice
      auth.ts                       # resilient admin sign-in helper
      adminShellPage.ts             # page object for the administration shell
      auth.setup.ts                 # signs in once, persists storage state
      admin-signin.smoke.spec.ts    # basic "can sign in and load the shell" smoke test
```

When a helper is used by only one slice it lives in that slice's folder; the
moment a second slice needs it, that's the signal to promote it to `e2e/shared/`.

### Projects and shared authentication

`playwright.config.ts` defines three projects:

- **`live-site`** — the existing membership/live-site specs (everything outside
  the `admin/` folder).
- **`admin-setup`** — runs `auth.setup.ts` once. It signs into the admin UI and
  writes the browser storage state to `playwright/.auth/admin.json`.
- **`admin-tests`** — the admin specs. They depend on `admin-setup` and reuse
  the stored storage state, so each test starts already authenticated instead of
  repeating the sign-in flow.

The storage state file contains live session cookies and is **git-ignored** —
it is regenerated on every run.

## Configuration

All values have local defaults and can be overridden with environment variables
(see `e2e/shared/config.ts`):

| Variable                 | Default                          | Purpose                                    |
| ------------------------ | -------------------------------- | ------------------------------------------ |
| `DANCING_GOAT_BASE_URL`  | `http://localhost:21295`         | App base URL (live site).                  |
| `ADMIN_BASE_URL`         | `<base>/admin`                   | Administration sign-in / shell entry point.|
| `ADMIN_DEFAULT_USERNAME` | `administrator`                  | Admin account used for E2E sign-in.        |
| `ADMIN_DEFAULT_PASSWORD` | `Pass@12345`                     | Admin account password (inject via secret).|

The DancingGoat database installer seeds a single `administrator` account whose
password matches the SA password used during installation. In CI, supply
`ADMIN_DEFAULT_PASSWORD` from GitHub Secrets rather than relying on the default.

## Running the tests

From the `tests/` folder:

```powershell
npm ci
npm run install:browsers

# Everything (live-site + admin)
npm test

# Just the admin suite (runs admin-setup first automatically)
npm run test:admin

# Just the live-site suite
npm run test:live-site
```

Playwright starts the DancingGoat app automatically (`webServer` in the config)
and reuses an already-running instance locally. A database must exist first — see
[Contributing Setup](./Contributing-Setup.md#database-setup).

## Selector policy for the admin UI

The built-in administration UI is **not owned by this codebase**, so its markup
(including `data-testid` attributes) can change between Kentico releases. Tests
should therefore prefer stable, semantic selectors and centralize any fragile
ones behind page objects.

Priority, most preferred first:

1. **ARIA role/name** — `getByRole('link', { name: /content hub/i })`
2. **Label-based** — `getByLabel('User name')`
3. **Stable visible text** — `getByText('Member Management')`
4. **`data-testid`** — only as a fallback for built-in admin UI, and only inside
   a page object so a future change is fixed in one place.
5. **For custom admin components you own in this repository**, add intentional,
   test-specific attributes (for example `data-testid`) designed for E2E.

Additional reliability practices used here:

- Explicitly wait for a shell landmark after each route transition.
- Retain traces, screenshots, and video on failure (configured globally).
- Use unique test data keys per test to avoid collisions on shared state, and
  keep scenarios non-destructive where possible.

## Adding more admin scenarios

The sign-in smoke test is the foundation. Good next scenarios to add — mirroring
the [Kentico Community Portal](https://github.com/Kentico/community-portal) admin
suite — include:

- Navigating to a custom application and asserting its landing page.
- Editing a content item field and verifying the success notification.
- Adding and configuring a widget in Page Builder (the canvas is a same-origin
  `iframe[title="Page builder"]`; Kentico web components expose open shadow roots
  that Playwright CSS selectors pierce automatically).

Add new specs, page objects, and helpers together under `tests/e2e/admin/`
(the admin slice). For a brand-new area, create a new slice folder such as
`tests/e2e/checkout/` holding its own specs and support code.

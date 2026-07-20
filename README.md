# Xperience by Kentico Labs: E2E Testing

[![Kentico Labs](https://img.shields.io/badge/Kentico_Labs-grey?labelColor=orange&logo=data:image/svg+xml;base64,PHN2ZyBjbGFzcz0ic3ZnLWljb24iIHN0eWxlPSJ3aWR0aDogMWVtOyBoZWlnaHQ6IDFlbTt2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO2ZpbGw6IGN1cnJlbnRDb2xvcjtvdmVyZmxvdzogaGlkZGVuOyIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik05NTYuMjg4IDgwNC40OEw2NDAgMjc3LjQ0VjY0aDMyYzE3LjYgMCAzMi0xNC40IDMyLTMycy0xNC40LTMyLTMyLTMyaC0zMjBjLTE3LjYgMC0zMiAxNC40LTMyIDMyczE0LjQgMzIgMzIgMzJIMzg0djIxMy40NEw2Ny43MTIgODA0LjQ4Qy00LjczNiA5MjUuMTg0IDUxLjIgMTAyNCAxOTIgMTAyNGg2NDBjMTQwLjggMCAxOTYuNzM2LTk4Ljc1MiAxMjQuMjg4LTIxOS41MnpNMjQxLjAyNCA2NDBMNDQ4IDI5NS4wNFY2NGgxMjh2MjMxLjA0TDc4Mi45NzYgNjQwSDI0MS4wMjR6IiAgLz48L3N2Zz4=)](https://github.com/Kentico/.github/blob/main/SUPPORT.md#labs-limited-support) [![CI: Build and Test](https://github.com/Kentico/xperience-by-kentico-labs-e2e-testing/actions/workflows/ci.yml/badge.svg)](https://github.com/Kentico/xperience-by-kentico-labs-e2e-testing/actions/workflows/ci.yml)

## Description

This project uses [Playwright](https://playwright.dev) to drive end-to-end (E2E) automated tests across the Xperience by Kentico feature set, demonstrating patterns developers and agents can copy into their own projects. It covers two areas:

- **Public website (live-site) experiences** — visitor-facing flows such as member registration, email confirmation, and sign-in. Email-dependent flows are asserted using the Xperience by Kentico Virtual Inbox integration.
- **The Xperience administration interface** — signing in and testing extensions to the admin UI (custom applications, UI pages, page extenders, components) and the Page Builder experience for marketers (widgets, sections, page templates).

Tests are organized as [vertical slices](./docs/Admin-E2E-Testing.md#how-it-is-organized) — each feature owns its specs, page objects, and helpers in a single folder under `tests/e2e/`.

For details on the administration testing setup — sign-in, storage-state reuse, and selector policy — see [Admin UI E2E Testing](./docs/Admin-E2E-Testing.md).

It has a functioning GitHub Actions CI pipeline that runs both the live-site and administration E2E suites against the Dancing Goat sample project.

You can review the CI GitHub workflow runs and Playwright test report:

- [View the repository actions](https://github.com/Kentico/xperience-by-kentico-labs-e2e-testing/actions/workflows/ci.yml)
- Open a specific workflow run and navigate to its artifacts
- Download the `playwright-report` artifact and view its `index.html` report in your browser

This project began as the companion to the Kentico Community Portal blog post [Virtual Inbox, Real Tests: AI-driven E2E automation for Xperience by Kentico membership flows](https://community.kentico.com/blog/virtual-inbox-real-tests-ai-driven-e2e-automation-for-xperience-by-kentico-membership-flows), and has since expanded to cover administration UI testing.

### Learn more

Automating the administration interface:

- [Administration interface UI tests: Official Xperience docs](https://docs.kentico.com/documentation/developers-and-admins/customization/extend-the-administration-interface/administration-interface-ui-tests)
- [Extend the administration interface](https://docs.kentico.com/documentation/developers-and-admins/customization/extend-the-administration-interface)

Adding membership to your Xperience by Kentico project:

- [Forms authentication: Official Xperience docs](https://docs.kentico.com/documentation/developers-and-admins/development/registration-and-authentication/forms-authentication)
- [Implement a member registration widget](https://docs.kentico.com/guides/development/members/implement-member-registration)
- [Xperience by Kentico Training Lab](https://github.com/Kentico/xperience-by-kentico-training-lab) for an example implementation
- [Kentico Community Portal source code](https://github.com/kentico/community-portal) for a full implementation

## Requirements

### Dependencies

- [ASP.NET Core 10.0](https://dotnet.microsoft.com/en-us/download)
- [Xperience by Kentico](https://docs.kentico.com)
- [Node.js LTS](https://nodejs.org/en/download)

## Quick Start

1. Clone this repository
1. Install the project's NuGet and npm dependencies
   - This can be done manually or through included VS Code tasks
1. [Create a database](https://docs.kentico.com/documentation/developers-and-admins/installation#create-the-project-database) for the Dancing Goat project
   - The database installer seeds the `administrator` account used by the administration tests
1. Run all E2E tests with `npx playwright test` in the `./tests` folder
   - This runs both the live-site and administration suites (Playwright starts the Dancing Goat app automatically)
   - Run a single area with `npm run test:live-site` or `npm run test:admin`

See [Admin UI E2E Testing](./docs/Admin-E2E-Testing.md) for configuration, running options, and the administration selector policy.

## Contributing

To see the guidelines for Contributing to Kentico open source software, please see [Kentico's `CONTRIBUTING.md`](https://github.com/Kentico/.github/blob/main/CONTRIBUTING.md) for more information and follow the [Kentico's `CODE_OF_CONDUCT`](https://github.com/Kentico/.github/blob/main/CODE_OF_CONDUCT.md).

Instructions and technical details for contributing to **this** project can be found in [Contributing Setup](./docs/Contributing-Setup.md).

## License

Distributed under the MIT License. See [`LICENSE.md`](./LICENSE.md) for more information.

## Support

[![Kentico Labs](https://img.shields.io/badge/Kentico_Labs-grey?labelColor=orange&logo=data:image/svg+xml;base64,PHN2ZyBjbGFzcz0ic3ZnLWljb24iIHN0eWxlPSJ3aWR0aDogMWVtOyBoZWlnaHQ6IDFlbTt2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO2ZpbGw6IGN1cnJlbnRDb2xvcjtvdmVyZmxvdzogaGlkZGVuOyIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik05NTYuMjg4IDgwNC40OEw2NDAgMjc3LjQ0VjY0aDMyYzE3LjYgMCAzMi0xNC40IDMyLTMycy0xNC40LTMyLTMyLTMyaC0zMjBjLTE3LjYgMC0zMiAxNC40LTMyIDMyczE0LjQgMzIgMzIgMzJIMzg0djIxMy40NEw2Ny43MTIgODA0LjQ4Qy00LjczNiA5MjUuMTg0IDUxLjIgMTAyNCAxOTIgMTAyNGg2NDBjMTQwLjggMCAxOTYuNzM2LTk4Ljc1MiAxMjQuMjg4LTIxOS41MnpNMjQxLjAyNCA2NDBMNDQ4IDI5NS4wNFY2NGgxMjh2MjMxLjA0TDc4Mi45NzYgNjQwSDI0MS4wMjR6IiAgLz48L3N2Zz4=)](https://github.com/Kentico/.github/blob/main/SUPPORT.md#labs-limited-support)

This project has **Kentico Labs limited support**.

See [`SUPPORT.md`](https://github.com/Kentico/.github/blob/main/SUPPORT.md#full-support) for more information.

For any security issues see [`SECURITY.md`](https://github.com/Kentico/.github/blob/main/SECURITY.md).

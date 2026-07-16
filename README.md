# Xperience by Kentico Labs: E2E Membership Testing

[![Kentico Labs](https://img.shields.io/badge/Kentico_Labs-grey?labelColor=orange&logo=data:image/svg+xml;base64,PHN2ZyBjbGFzcz0ic3ZnLWljb24iIHN0eWxlPSJ3aWR0aDogMWVtOyBoZWlnaHQ6IDFlbTt2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO2ZpbGw6IGN1cnJlbnRDb2xvcjtvdmVyZmxvdzogaGlkZGVuOyIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik05NTYuMjg4IDgwNC40OEw2NDAgMjc3LjQ0VjY0aDMyYzE3LjYgMCAzMi0xNC40IDMyLTMycy0xNC40LTMyLTMyLTMyaC0zMjBjLTE3LjYgMC0zMiAxNC40LTMyIDMyczE0LjQgMzIgMzIgMzJIMzg0djIxMy40NEw2Ny43MTIgODA0LjQ4Qy00LjczNiA5MjUuMTg0IDUxLjIgMTAyNCAxOTIgMTAyNGg2NDBjMTQwLjggMCAxOTYuNzM2LTk4Ljc1MiAxMjQuMjg4LTIxOS41MnpNMjQxLjAyNCA2NDBMNDQ4IDI5NS4wNFY2NGgxMjh2MjMxLjA0TDc4Mi45NzYgNjQwSDI0MS4wMjR6IiAgLz48L3N2Zz4=)](https://github.com/Kentico/.github/blob/main/SUPPORT.md#labs-limited-support) [![CI: Build and Test](https://github.com/Kentico/xperience-by-kentico-labs-e2e-membership-testing/actions/workflows/ci.yml/badge.svg)](https://github.com/Kentico/xperience-by-kentico-labs-e2e-membership-testing/actions/workflows/ci.yml)

## Description

This project uses Playwright and the Xperience by Kentico Virtual Inbox integration to drive E2E automated tests for membership experiences.

It also demonstrates E2E testing of the **Xperience administration interface** — see [Admin UI E2E Testing](./docs/Admin-E2E-Testing.md) for how the admin sign-in, storage-state reuse, and selector policy are set up.

It has a functioning GitHub actions CI pipeline that performs E2E tests on the Dancing Goat membership experience.

You can review the CI GitHub workflow runs and Playwright test report:

- [View the repository actions](https://github.com/Kentico/xperience-by-kentico-labs-e2e-membership-testing/actions/workflows/ci.yml).
- [Navigate to the artifacts](https://github.com/Kentico/xperience-by-kentico-labs-e2e-membership-testing/actions/runs/23347912210) for a specific workflow run.
- [Download the playwright-report artifact](https://github.com/Kentico/xperience-by-kentico-labs-e2e-membership-testing/actions/runs/23347912210/artifacts/6027409808)
- View the artifact's `index.html` report in your browser

This project is part of the Kentico Community Portal blog post [Virtual Inbox, Real Tests: AI-driven E2E automation for Xperience by Kentico membership flows](https://community.kentico.com/blog/virtual-inbox-real-tests-ai-driven-e2e-automation-for-xperience-by-kentico-membership-flows)

If you are interested in adding membership to your Xperience by Kentico project, explore the following resources:

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
1. Run the playwright tests by running `npx playwright test` in the `./tests` folder

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

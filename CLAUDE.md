## Commands

Install - pnpm install

Build - pnpm build

Test - pnpm test

These single-file commands run from the package root (e.g. `v-next/hardhat`):

Lint single file - `eslint path/to/file.ts`

Test single file - `node --import tsx/esm --test --test-reporter=@nomicfoundation/hardhat-node-test-reporter path/to/test.ts`

Test single test - add `.only` to the test, then `node --import tsx/esm --test --test-only --test-reporter=@nomicfoundation/hardhat-node-test-reporter path/to/test.ts`

## Repository layout

v-next/\* – publishable packages

v-next/hardhat - core logic and cli

## Rules

**Lazy loading external packages** — Hardhat optimizes startup time. Follow this strictly:

- Top-level imports allowed for: `node:fs`, `node:path`, `node:util`, `chalk`, `semver`, and `import type`
- Everything else: use `await import()` inside the function that needs it

**`hardhat-utils` first** — Before using `node:fs` or writing a utility, check `@nomicfoundation/hardhat-utils`. It covers fs, crypto, hex, error handling, and more.

**Errors** — Only throw `HardhatError`. Never `throw new Error()`. Use `HardhatError.isHardhatError()` (not `instanceof`) and `ensureError()` in catch clauses. `./scripts` is exempt.

## Development workflow

After modifying a package, within the package run:

1. pnpm lint
2. pnpm build
3. pnpm test

## Scoped docs to read

- If changing anything in ./scripts/, read ./scripts/README.md first.

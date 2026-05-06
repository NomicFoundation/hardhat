## Commands

Install - pnpm install

Build - pnpm build

Test - pnpm test

These single-file commands run from the package root (e.g. `packages/hardhat`):

Lint single file - `pnpm exec eslint ./path/to/file.ts`

Test single file - `node --import tsx/esm --test --test-reporter=@nomicfoundation/hardhat-node-test-reporter path/to/test.ts`

Test single test - add `.only` to the test, then `node --import tsx/esm --test --test-only --test-reporter=@nomicfoundation/hardhat-node-test-reporter path/to/test.ts`

## Repository layout

packages/\* – publishable packages

packages/hardhat - core logic and cli

## Rules

**Package structure** — Exported code and types (via `package#exports`) live under `src/`, non-exported internals under `src/internal/`.

**`hardhat-utils` first** — Before using `node:fs` or writing a utility, check `@nomicfoundation/hardhat-utils`. It covers fs, crypto, hex, error handling, and more.

**Errors** — Only throw `HardhatError`. Never `throw new Error()`. Use `HardhatError.isHardhatError()` (not `instanceof`) and `ensureError()` in catch clauses. `./scripts` is exempt.

### Using imports correctly in Hardhat 3

Use `await import` only if one of these conditions is met:

1. The file with the import is part of the `hardhat` package, is always imported at startup (i.e. imported by `hardhat`'s `src/internal/cli/main.ts` or `src/index.ts`, directly or transitively), and the imported module isn't always used (e.g. `./init/init.js` in `hardhat`'s `main.ts`)
2. The import path is dynamic (e.g. the user config path)
3. The file is dynamically loaded by a wrapper that exports the same interface that loads it on first access (mostly used for HRE extensions, e.g. `src/internal/builtin-plugins/network-manager/hook-handlers/hre.ts` in `hardhat`)
4. The dynamic import is used to avoid a circular dependency (e.g. importing the `HRE` at runtime)
5. The import has to happen at a certain point in time (mostly used for import side-effects, e.g. `await import(...)` without doing anything with the imported module)
6. If there's a comment justifying it, and the imported module is cached (i.e. not running `await import(...)` every time, but instead doing something like `if (cachedModule === undefined) { cachedModule = await import(...) }`). Some code duplication in this case is acceptable if that avoids adding unnecessary async logic (e.g. avoid `const module = await getModule()` to avoid repeating just a few conditionals).

`ConfigHooks` and `HardhatRuntimeEnvironmentHooks` factories run on every Hardhat invocation, so they're treated like condition 1: only types, error helpers, and lightweight utilities at the top level; heavy work goes behind `await import` inside the handler bodies, or behind a lazy wrapper.

`NetworkHooks` aren't always run, but `newConnection` handlers that extend `NetworkConnection` (e.g. `connection.foo = …`) must return a lazy wrapper rather than eagerly loading the helper. Reference pattern: `packages/hardhat-ignition-ethers/src/internal/hook-handlers/network.ts`. When the wrapper caches both the imported module and an instance built from it, the getter must run `await import(...)` **before** the instance cache check — see the "Ordering in cached lazy getters" section in `docs/engineering-guidelines.md` (under GC3) for the rationale and code shape.

The only accepted imports in the `index.ts` file of plugins (both built-in and external) are their `type-extension`, types and `enums` from `hardhat`, and `hardhat/config`, and potentially a simple file with constants. They can also import files that follow these same rules and restrictions. Everything else should be imported by a callback registered in the plugin object.

Test files are free to use `await import` freely.

## Development workflow

After modifying a package, within the package run:

1. pnpm lint
2. pnpm build
3. pnpm test

## Scoped docs to read

- If changing anything in ./scripts/, read ./scripts/README.md first.

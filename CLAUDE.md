## Commands

Install - pnpm install

Build - pnpm build

Test - pnpm test

For single-file work, run these from the repo root. They build upstream deps and run the tool on the given path(s):

Lint single file - `pnpm lint:file path/to/file.ts` (runs prettier --check + eslint; pass `--fix` to auto-apply fixes)

Test single file - `pnpm test:file path/to/test.ts`

Test single test - add `.only` to the test, then `pnpm test:file --only path/to/test.ts`

Spellcheck single file - `pnpm spellcheck:file path/to/file.md`

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

The only accepted imports in the `index.ts` file of plugins (both built-in and external) are their `type-extension`, types and `enums` from `hardhat`, `hardhat/config`, `hardhat/plugins` (for `definePlugin`), and potentially a simple file with constants. They can also import files that follow these same rules and restrictions. Everything else should be imported by a callback registered in the plugin object.

`ConfigHooks` and `HardhatRuntimeEnvironmentHooks` factories run on every Hardhat invocation, so they should follow the same criteria as the plugin's `index.ts` file.

`NetworkHooks` aren't always run, but `newConnection` handlers that extend `NetworkConnection` (e.g. `connection.foo = …`) should consider lazily initializing their bussiness logic, unless they are virtually always used. The reason for this is that otherwise the first network connection initializes too many unnecessary things. For example, the `hardhat-ethers` plugin doesn't need to be lazily initialized, as most users that install it will use it most of the time after creating a new network. On the contrary, the `hardhat-ignition-ethers` plugin isn't always used, so it should be lazily initialized.

Reference pattern for lazy initialization: `packages/hardhat-ignition-ethers/src/internal/hook-handlers/network.ts`. When the wrapper caches both the imported module and an instance built from it, the getter must run `await import(...)` **before** the instance cache check — see the "Ordering in cached lazy getters" section in `docs/engineering-guidelines.md` (under GC3) for the rationale and code shape.

Test files are free to use `await import` freely.

## Development workflow

After modifying a package, within the package run:

1. pnpm lint
2. pnpm build
3. pnpm test

After modifying a test file, run it with the "Test single file" command above.

## Scoped docs to read

- If changing anything in ./scripts/, read ./scripts/README.md first.

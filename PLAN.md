# Hardhat 3 without tsx: native Node type stripping

## Context

Hardhat 3 today always registers `tsx`'s ESM loader in-process before importing
`hardhat.config.ts` (see `register()` in [main.ts:193](packages/hardhat/src/internal/cli/main.ts#L193)),
and ships `tsx` as a hard `dependency` of the `hardhat` package
([package.json:110](packages/hardhat/package.json#L110)). `tsx` pulls in `esbuild`,
whose npm postinstall script trips pnpm's blocked-build-scripts error and forces a
native binary download on every install — even for users who never need transpilation.

Node 22.18+ (and 23.6+) strip TypeScript types natively with **no flag and no tooling**.
We want new projects to use that path by default, keep transpilation available for
users who need it (enums, decorators, legacy syntax, older Node), and stop installing
`tsx` unless a project explicitly opts in.

**Outcome:** a project declares its mode in `package.json`
(`"hardhat": { "typescriptSupport": "native" | "tsx" }`). In `native` mode Hardhat never
touches `tsx`; in `tsx` mode it registers the loader as today. `tsx` becomes an optional
peer dependency, so a default install pulls no `esbuild`. This is a deliberate breaking
change, phased to minimize pain.

This plan covers a **vertical-slice prototype** that proves the native path end-to-end
(config load, `run`, node test runner, mocha incl. parallel) with no `tsx` present, and
serves as the basis for the design doc.

## Status — implemented & verified

The slice is built. Notes below correct the as-designed plan where reality differed:

- **The flip-point default constant lives in `hardhat-utils`, not core.** It's
  `DEFAULT_TYPESCRIPT_SUPPORT_MODE` in `@nomicfoundation/hardhat-utils/typescript-support`
  (not `PRE_STABLE_DEFAULT_TS_SUPPORT` in core), so `hardhat-mocha` can share the exact
  same constant without importing hardhat internals.
- **No `eslint-disable` is needed in main.ts.** ESLint's `no-restricted-syntax` does not
  flag a conditional `await import()` inside a function body, so the directive the plan
  showed was reported as unused and removed.
- **`TSX_NOT_INSTALLED` is thrown inline in main.ts**, not in the core
  `typescript-support.ts` module. The core module only owns `resolveTypescriptSupportMode`
  (throws `INVALID_TYPESCRIPT_SUPPORT_VALUE`) and `assertNativeModeIsUsable` (throws
  `NATIVE_TS_REQUIRES_NEWER_NODE`).
- **The native template's tsconfig uses `noEmit: true`, not `outDir`.**
  `allowImportingTsExtensions: true` is only valid with `noEmit`/`emitDeclarationOnly`, so
  the native template can't keep `03-minimal`'s `outDir: "dist"`. `noEmit` is also the
  correct shape for native projects (Node runs the `.ts` directly; nothing is emitted).
- **The native template ships only a sample script, no node-test-runner test.** The
  minimal template has no TypeScript test-runner plugin, so a `test/*.ts` wouldn't be
  discovered/run; exercising the node test runner needs the toolbox/runner (out of scope).
- **The deprecation nudge prints once per CLI run, on the CLI path only** (main.ts passes a
  `print` sink; the mocha re-resolution uses the pure helper with no sink, so there's no
  double-print). It is not deduplicated across separate invocations.

Verified end-to-end: in the `04-minimal-native` template (its `node_modules` contains no
`tsx`), `tsc --noEmit` passes and `hardhat run scripts/example.ts` loads the `.ts` config
and runs the `.ts` script via Node stripping. Under `--no-experimental-strip-types`, native
mode fails cleanly (no tsx fallback) and `assertNativeModeIsUsable()` throws `HHE28`; tsx
mode still transpiles. Invalid value → `HHE27`; key-less → tsx default + nudge. Existing
tests pass: main.ts (99), hre-initialization (18), hardhat-mocha (14).

## Decisions (locked)

- **Opt-in key:** `package.json` → `"hardhat": { "typescriptSupport": "native" | "tsx" }`
  (camelCase). Must live in `package.json`, not `hardhat.config.ts`, because we need the
  mode *before* we can import the TS config.
- **Native requires Node ≥ 22.18.** On 22.13–22.17 (or with stripping disabled), selecting
  `native` throws a clear, actionable error. `tsx` mode keeps working across the full
  supported range (≥ 22.13).
- **Migration phasing via one constant.** Pre-stable: absent key ⇒ default `"tsx"` (today's
  behavior) + a deprecation nudge (printed once per CLI run, on the CLI path only). At the
  stable release: flip the constant ⇒ absent key defaults to `"native"` (the breaking change).
  `tsx` then must be opted into *and* installed.
- **Scope:** vertical slice (below), not the full feature.

## Background (current behavior, verified)

- `cli.ts` → `main(argv, { registerTsx: isTsxRequired() })`; `isTsxRequired()` is `false`
  only on Deno ([cli.ts:17](packages/hardhat/src/cli.ts#L17)).
- `main.ts` statically imports `register` from `tsx/esm/api` and calls it whenever
  `registerTsx === true`, right after `printEsmErrorMessageIfNecessary(projectRoot)` and
  before `importUserConfig(configPath)`. Because the loader is always registered first, the
  native-import path that *already exists* in config-loading is shadowed by `tsx` today.
- [config-loading.ts:142](packages/hardhat/src/internal/config-loading.ts#L142)
  `importConfigFileWithTsxFallback` already tries native `import()` first and only falls back
  to `await import("tsx/esm/api")` + `tsImport()` on `ERR_UNKNOWN_FILE_EXTENSION` for `.ts`.
  It maps tsx `TransformError` → `INVALID_CONFIG_FILE` and caches via `compiledConfigFile`.
  **Second caller:** `importUserConfig` is also invoked by `getOrCreateGlobalHardhatRuntimeEnvironment()`
  in `hre-initialization.ts` (the programmatic API, re-exported from `src/hre.ts`) — that path
  never runs `main.ts` and must be handled too.
- User `.ts` runs **in-process** for the node test runner (`node:test`, `isolation: "none"`),
  mocha non-parallel, and the `run` task (`await import(pathToFileURL(...).href)`) — all work
  under native stripping with no loader.
- **Mocha parallel** is the one user-facing subprocess path that injects `--import tsx/esm`
  via `process.env.NODE_OPTIONS` ([hardhat-mocha task-action.ts:112-138](packages/hardhat-mocha/src/task-action.ts#L112)).
  Worker subprocesses inherit native stripping and need **no flag** in native mode (confirmed
  by a design-time probe; the slice gates the injection on the mode but did not run a
  parallel-native mocha suite live — a verification gap to close).
- Other `--import tsx/esm` sites (solcjs-runner in [compiler.ts:125](packages/hardhat/src/internal/builtin-plugins/solidity/build-system/compiler/compiler.ts#L125),
  sentry `transport.ts`, `hardhat-utils/subprocess.ts`) gate on the *shipped runner* being
  `.ts`, which is only true inside this monorepo's own dev/test — **not user-facing**. Out of
  scope (follow-ups).
- Error classifier already buckets `ERR_UNKNOWN_FILE_EXTENSION`,
  `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, `ERR_NO_TYPESCRIPT`,
  `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` as `TYPESCRIPT_SUPPORT_ERROR`.

## Design

**Capability detection (not version-sniffing).** Use `process.features.typescript`: `"strip"`
(default-on) or `"transform"` (under `--experimental-transform-types`) ⇒ native works;
`false`/absent ⇒ unavailable. This correctly catches `--no-experimental-strip-types` even on
new Node. The 22.18 version check is used *only* to phrase the upgrade message.

**Where code lives.** `hardhat-utils` cannot import `hardhat-errors`, so split:
- Pure building blocks → **`hardhat-utils`** (new `src/typescript-support.ts`, only needs
  `readClosestPackageJson`): the `TypescriptSupportMode` type, the
  `DEFAULT_TYPESCRIPT_SUPPORT_MODE` flip-point constant, `readTypescriptSupportField`,
  `isValidTypescriptSupportMode`, and the capability checks. Importable by `hardhat-mocha`.
- `HardhatError`-throwing wrappers → **`hardhat` core** (new
  `src/internal/typescript-support.ts`): `resolveTypescriptSupportMode` (applies the default
  + nudge, validates the value) and `assertNativeModeIsUsable`. The tsx-missing error
  (`TSX_NOT_INSTALLED`) is thrown inline in main.ts, where the dynamic `import("tsx/esm/api")`
  happens.

**Mode threading (no global mutable state).** config-loading runs before the HRE exists, so
pass the mode as an explicit parameter. The mocha task action re-resolves from
`hre.config.paths.root` (cheap re-read of package.json; avoids adding a config field for the
prototype).

## Implementation steps

### 1. Pure building blocks — `packages/hardhat-utils/src/typescript-support.ts` (new)
- `type TypescriptSupportMode = "native" | "tsx"`.
- `const MIN_NATIVE_TS_NODE_VERSION: readonly number[] = [22, 18, 0]`.
- `const DEFAULT_TYPESCRIPT_SUPPORT_MODE: TypescriptSupportMode = "tsx"` — **the single
  flip-point.** Change to `"native"` at the stable release. Lives here (not core) so
  `hardhat-mocha` shares the same constant.
- `function isValidTypescriptSupportMode(value: unknown): value is TypescriptSupportMode`.
- `async function readTypescriptSupportField(projectRoot: string): Promise<string | undefined>`
  — `readClosestPackageJson(projectRoot)`, return `pkg.hardhat?.typescriptSupport`.
- `function isNativeTypeStrippingAvailable(): boolean` — `process.features.typescript === "strip" || === "transform"`.
- `function isNodeNewEnoughForNativeTs(): boolean` — integer compare vs `MIN_NATIVE_TS_NODE_VERSION`,
  reusing the pattern in [node-version.ts](packages/hardhat/src/internal/cli/node-version.ts).
- Export it from this package's `package#exports` (`./typescript-support`).

In [package.ts](packages/hardhat-utils/src/package.ts) extend the `PackageJson` interface (lines 42-55):
`hardhat?: { typescriptSupport?: "native" | "tsx" }` (loosely typed; validation lives in core).

### 2. Core wrappers — `packages/hardhat/src/internal/typescript-support.ts` (new)
- `async function resolveTypescriptSupportMode(projectRoot, print?): Promise<TypescriptSupportMode>`
  — read the field; `undefined` ⇒ return `DEFAULT_TYPESCRIPT_SUPPORT_MODE` (+ emit the deprecation
  nudge via `print` while that default is `tsx`); unknown value ⇒ throw `INVALID_TYPESCRIPT_SUPPORT_VALUE`.
- `function assertNativeModeIsUsable(): void` — if `!isNativeTypeStrippingAvailable()`, throw
  `NATIVE_TS_REQUIRES_NEWER_NODE` (message references `MIN_NATIVE_TS_NODE_VERSION` and the running version).

### 3. Conditional registration — [main.ts](packages/hardhat/src/internal/cli/main.ts)
- Remove the static `import { register } from "tsx/esm/api"`.
- After `projectRoot` + the ESM check, the **entire** mode resolution/registration must sit
  inside `if (options.registerTsx === true)` — on Deno (`registerTsx === false`) we skip it
  all, leaving `tsMode = "native"` so config-loading uses the runtime's own stripping. Do
  **not** call `assertNativeModeIsUsable()` on the Deno path (Deno's `process.features.typescript`
  isn't `"strip"`, so it would wrongly throw):
  ```ts
  let tsMode: TypescriptSupportMode = "native";
  if (options.registerTsx === true) {
    tsMode = await resolveTypescriptSupportMode(projectRoot, print);
    if (tsMode === "native") {
      assertNativeModeIsUsable();
    } else {
      // Dynamic import of the optional tsx dependency (CLAUDE.md rules 1/5).
      // No eslint-disable is needed: no-restricted-syntax doesn't flag a
      // conditional await import() inside a function body.
      let register;
      try { ({ register } = await import("tsx/esm/api")); }
      catch { throw new HardhatError(...TSX_NOT_INSTALLED); }
      register();
    }
  }
  ```
- Pass `tsMode` into `importUserConfig(configPath, tsMode)`.

### 4. Mode-aware config loading — [config-loading.ts](packages/hardhat/src/internal/config-loading.ts)
- `importUserConfig(configPath, tsMode: TypescriptSupportMode = DEFAULT_TYPESCRIPT_SUPPORT_MODE)`
  (param defaulted for backward-compatible public/programmatic callers).
- In `importConfigFileWithTsxFallback`, only enter the tsx fallback branch when
  `tsMode !== "native"`; in native mode the original error is rethrown so `tsx` is never
  imported when absent. (On the CLI path this rethrow is effectively unreachable: main.ts
  calls `assertNativeModeIsUsable()` first, so native mode only reaches here when stripping
  works.) Preserve the `TransformError` mapping and cache for tsx mode.
- In `getOrCreateGlobalHardhatRuntimeEnvironment()` (`hre-initialization.ts`), resolve the mode
  via `resolveTypescriptSupportMode(projectRoot)` and pass it through.

### 5. tsx as optional peer — [packages/hardhat/package.json](packages/hardhat/package.json)
- Remove `"tsx"` from `dependencies`.
- Add `"peerDependencies": { "tsx": "^4.19.3" }` + `"peerDependenciesMeta": { "tsx": { "optional": true } }`.
- Add `"tsx": "^4.19.3"` to `devDependencies` (this package's own `test` scripts use `node --import tsx/esm`).

### 6. Mocha parallel — [hardhat-mocha task-action.ts](packages/hardhat-mocha/src/task-action.ts#L112)
- Resolve mode via the `hardhat-utils` pure resolver from `hre.config.paths.root`.
- Only push `tsx.href` into `imports` when mode is `"tsx"`; in native mode skip it (workers strip
  natively). Keep `unhandledRejectionHook` / `testWorkerDone` pushes unconditional.

### 7. Native template — `packages/hardhat/templates/hardhat-3/04-minimal-native/` (new; clone `03-minimal`)
- `package.json`: add `"hardhat": { "typescriptSupport": "native" }`, keep `"type": "module"`, **no tsx**.
- `tsconfig.json`: add `"erasableSyntaxOnly": true` + `"verbatimModuleSyntax": true` (force
  strip-safe syntax + elide type-only imports) and `"allowImportingTsExtensions": true`; keep
  `module: "node20"`, `target: "es2023"`. **Replace `03-minimal`'s `outDir: "dist"` with
  `noEmit: true`** — `allowImportingTsExtensions` is only valid with `noEmit`/`emitDeclarationOnly`,
  and native projects emit nothing (Node runs the `.ts` directly). Author relative `.ts` imports
  with explicit `.ts` extensions (native Node does not rewrite specifiers).
- Add a sample `scripts/example.ts` to exercise `hardhat run`. (No node-test-runner `test/*.ts`:
  the minimal template has no TS test-runner plugin to discover it; exercising the node test
  runner under native mode is verified separately and a runner-based native template is a
  follow-up.)
- New workspace package, so `pnpm install` must run to wire its `node_modules` (verified: the
  install pulls **no** tsx/esbuild for this template).

### New error descriptors — [descriptors.ts](packages/hardhat-errors/src/descriptors.ts), `CORE.GENERAL` (next numbers 27/28/29)
- `INVALID_TYPESCRIPT_SUPPORT_VALUE` — invalid `hardhat.typescriptSupport` value; valid are `native`/`tsx`.
- `NATIVE_TS_REQUIRES_NEWER_NODE` — native needs Node ≥ {minVersion} (have {nodeVersion}); upgrade or set `"typescriptSupport": "tsx"`.
- `TSX_NOT_INSTALLED` — `"typescriptSupport": "tsx"` requires installing `tsx` (e.g. `npm i -D tsx`), or switch to `native`.

Match existing descriptor shape; none set `shouldBeReported` (user/environment errors).

## Edge cases & risks
- **Deno path first:** short-circuit on `options.registerTsx === false` before resolving the mode,
  so Deno never hits `TSX_NOT_INSTALLED` / `NATIVE_TS_REQUIRES_NEWER_NODE`.
- **Programmatic caller:** thread the mode through `hre-initialization.ts` or the API path silently
  keeps relying on the tsx fallback and breaks when tsx is absent.
- **Non-strippable TS** (enums, parameter properties, namespaces, `import =`) throws
  `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` in native mode; `erasableSyntaxOnly` prevents authoring it in
  new projects. Pre-existing projects flipping to native may hit it — the classifier already guides;
  mitigate with docs + the deprecation window.
- **Relative `.ts` imports** must be extensioned in native mode (tsx is lenient); covered by the
  template's `verbatimModuleSyntax` + explicit `.ts` extensions.
- **pnpm hoisting:** validate isolation with a genuinely external fixture (or by temporarily removing
  tsx), not by reading `package.json` — the monorepo root may hoist tsx and mask the difference.
- **Stable-flip blast radius:** flipping the default to `native` breaks every key-less, non-strip-clean
  project at once. The single constant + pre-stable nudge are the mitigation.

## Out of scope (follow-ups)
- Non-user-facing `--import tsx/esm` subprocess sites (solcjs-runner, sentry transport,
  hardhat-utils/subprocess) — only fire on `.ts` runners in this repo's dev/test.
- A resolved `hre.config.typescriptSupport` field (cleaner than re-reading package.json in mocha).
- Migrating the other two templates, docs/migration guide, and the actual stable-release flip.

## Verification
1. Build the touched packages: `pnpm build` in `hardhat`, `hardhat-errors`, `hardhat-utils`, `hardhat-mocha`.
2. Lint changed files: `pnpm lint:file <path>` each.
3. Confirm env: Node ≥ 22.18 and `process.features.typescript === "strip"`.
4. Native fixture (`type: module` + `"typescriptSupport": "native"`, **tsx physically absent** from its
   `node_modules`) — confirm no tsx/esbuild present and no postinstall ran. Then run, asserting tsx is
   never imported:
   - a task (config import via native `import()`),
   - `hardhat run scripts/example.ts`,
   - `hardhat test` with the node test runner,
   - mocha **non-parallel and parallel** (confirm `NODE_OPTIONS` carries no `--import tsx/esm` in native).
5. Negative cases: `tsx` selected but absent → `TSX_NOT_INSTALLED`; `native` on Node < 22.18 (or
   `--no-experimental-strip-types`) → `NATIVE_TS_REQUIRES_NEWER_NODE`; bogus value →
   `INVALID_TYPESCRIPT_SUPPORT_VALUE`; absent key → tsx default + deprecation nudge.
6. Regression: the `hardhat` package's own `pnpm test` (still uses `--import tsx/esm` from devDependencies) passes.

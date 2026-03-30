# Spec: `splitTestsCompilation` Config Field

## Overview

Add a `splitTestsCompilation` boolean field to the Solidity user config that controls whether Solidity test files are compiled in a separate pass from contract files.

- Default: `false`
- When `false`: contracts and tests are compiled together by default
- When `true`: current behavior is preserved

The long-term goal is to keep the split available for future dynamic-linking work, but stop paying for it by default until that functionality exists.

---

# Part 1: Behavioral Changes

## `hardhat` package

### Configuration

A new optional boolean field `splitTestsCompilation` is accepted in all object-typed Solidity user configs:

- `SingleVersionSolidityUserConfig`
- `MultiVersionSolidityUserConfig`
- `BuildProfilesSolidityUserConfig`

It defaults to `false`.

```typescript
export default {
  solidity: {
    version: "0.8.28",
    splitTestsCompilation: true,
  },
};
```

String-typed and string-array Solidity configs do not accept the field and always resolve it to `false`.

### Build System (`hre.solidity`)

#### `getScope(fsPath)` — Unchanged

File classification into `"contracts"` and `"tests"` is unchanged.

- Files under `paths.tests.solidity` ending in `.sol` are tests
- Files under `paths.sources.solidity` ending in `.t.sol` are tests
- Everything else falls back to contracts

This remains the source of truth for classifying local Solidity files.

#### `getRootFilePaths({ scope })`

| `splitTestsCompilation` | `scope: "contracts"` | `scope: "tests"` |
| --- | --- | --- |
| `false` | Returns all build roots: contract roots, test roots, and `npmFilesToBuild` roots | Throws `HardhatError` |
| `true` | Returns contract roots only | Returns test roots only |

When `splitTestsCompilation === false`, `getRootFilePaths({ scope: "tests" })` is a logic error and throws a new `HardhatError` (for example `SOLIDITY.SPLIT_TESTS_COMPILATION_DISABLED`).

#### Low-Level `build`, `getCompilationJobs`, `emitArtifacts`, and `cleanupArtifacts`

When `splitTestsCompilation === false`, the low-level Solidity build-system API also rejects `scope: "tests"` as a logic error, using the same `HardhatError` family as `getRootFilePaths({ scope: "tests" })`.

Affected methods:

- `hre.solidity.build(rootFiles, { scope: "tests" })`
- `hre.solidity.getCompilationJobs(rootFiles, { scope: "tests" })`
- `hre.solidity.emitArtifacts(compilationJob, compilerOutput, { scope: "tests" })`
- `hre.solidity.cleanupArtifacts(rootFiles, { scope: "tests" })`

`runCompilationJob` is not affected because its options type (`RunCompilationJobOptions`) does not include `scope` — by the time a compilation job runs, scope selection has already happened.

When `splitTestsCompilation === false` and `scope: "contracts"` is used:

- `scope` still influences user-facing logging and hook behavior
- artifacts are written to the main artifacts directory
- whether a root emits per-source `artifacts.d.ts` is decided per root file using `getScope()`
- low-level callers cannot opt into contracts/tests separation

When `splitTestsCompilation === true`, low-level behavior is unchanged.

#### `getArtifactsDirectory(scope)`

| `splitTestsCompilation` | `scope: "contracts"` | `scope: "tests"`           |
| ----------------------- | -------------------- | -------------------------- |
| `false`                 | `artifactsPath`      | `artifactsPath`            |
| `true`                  | `artifactsPath`      | `cachePath/test-artifacts` |

When `splitTestsCompilation === false`, both scopes point to the main artifacts directory because both contract and test artifacts live there.

Unlike `getRootFilePaths`, `build`, `getCompilationJobs`, `emitArtifacts`, and `cleanupArtifacts`, `getArtifactsDirectory` does **not** throw when called with `scope: "tests"` in unified mode. It is a read-only query with no side effects, so returning the shared artifacts path is safe and minimizes migration friction for plugins that only need to know where artifacts live.

#### `emitArtifacts()`

When `splitTestsCompilation === false`:

- All contract JSON artifacts are emitted into the main artifacts directory
- Build info and build info output files are emitted into `artifacts/build-info`
- Test roots do not emit per-source `artifacts.d.ts`. No typescript types for tests
- Contract roots still emit per-source `artifacts.d.ts` when built under `scope: "contracts"`

When `splitTestsCompilation === true`, behavior is unchanged.

#### `cleanupArtifacts()`

When `splitTestsCompilation === false`:

- Cleanup operates on the main artifacts directory
- Reachability is computed against the root-file set passed to cleanup, exactly as today
- Duplicate contract-name detection includes both contract and test artifacts
- The top-level `artifacts.d.ts` is written from the mixed artifact set when cleanup runs in `scope: "contracts"` to still type repeated bare names as `never`, as they can still create collisions of bare names with respect to `hre.artifacts`
- `onCleanUpArtifacts` receives mixed contract and test artifact paths when cleanup runs in `scope: "contracts"`

When `splitTestsCompilation === true`, behavior is unchanged.

### Artifact Manager APIs (`hre.artifacts` / `context.artifacts`)

When `splitTestsCompilation === false`, `hre.artifacts` and `context.artifacts` expose both contract and test artifacts because both are stored under `paths.artifacts`.

This is an accepted behavior change.

Consequences:

- `getAllArtifactPaths()` includes test artifacts
- `getAllFullyQualifiedNames()` includes test artifacts
- bare-name artifact lookup can become ambiguous if a test contract and a contract share the same name. Ambiguos names still type to `never` in the generated `artifacts.d.ts`
- plugins using `context.artifacts` must no longer assume that "artifacts path" means "contracts only"

Test artifacts still do not receive TypeScript support:

- no per-source `artifacts.d.ts` is emitted for test roots
- no TypeChain-generated types are emitted for test artifacts

### Compile Cache

`splitTestsCompilation` changes the output layout, so the compile cache needs explicit output-layout validation.

When `splitTestsCompilation === false`, compile-cache entries must store per-root output metadata:

- the artifacts directory used for that root
- whether that root emitted a TypeScript declaration file

Cache-hit validation must compare the cached output layout against the expected layout for the current build before checking file existence.

Expected output layout is derived from:

- `splitTestsCompilation`
- build `scope`
- the root file path, classified with the same logic as `getScope()`

Additional rules:

- old cache entries that do not have the new metadata are treated as misses
- toggling `splitTestsCompilation` invalidates cache hits through output-layout mismatch, not through the compilation-job `buildId`
- toggling from `true` to `false` may leave an orphaned `cache/test-artifacts/` directory; this is cleaned up by `hardhat clean` but not by a regular build

This keeps cache hits fast:

- expected layout is computed from strings and config, without extra filesystem traversal
- the fast path remains "compare cached metadata, then perform the existing output-file existence checks"

### Build Task (`hardhat build` / `hardhat compile`)

The high-level build task becomes mode-dependent.

When `splitTestsCompilation === false`:

- `build` uses a single compilation pass
- the pass runs with `scope: "contracts"`
- the existing contracts-scope log text is kept

Behavior by input mode when `splitTestsCompilation === false`:

1. Full build: `files.length === 0`, `noTests === false`, `noContracts === false`

   - Build all contract and test roots together
   - Run cleanup once on the main artifacts directory
   - Regenerate the top-level `artifacts.d.ts`
   - Invoke `onCleanUpArtifacts` once with the mixed artifact set

2. Explicit files: `files.length > 0`

   - Build exactly the provided files in a single pass, regardless of scope
   - This is a partial build
   - No cleanup runs
   - No top-level `artifacts.d.ts` regeneration occurs
   - `onCleanUpArtifacts` does not run
   - Return values are partitioned into `contractRootPaths` and `testRootPaths` using `getScope()`

3. `--no-tests` with no explicit `files`

   - Behaves as if all contract roots had been passed through `files`
   - This is a partial build
   - No cleanup runs
   - No top-level `artifacts.d.ts` regeneration occurs
   - `onCleanUpArtifacts` does not run
   - Any stale artifacts or stale build-info files remain, exactly like any other partial build
   - Note: this is a behavior change from `splitTestsCompilation === true`, where `--no-tests` runs a full contracts build with cleanup. The migration guide (Phase 11) should call this out.

4. `--no-contracts` with no explicit `files`

   - Behaves as if all test roots had been passed through `files`
   - This is a partial build
   - No cleanup runs
   - No top-level `artifacts.d.ts` regeneration occurs
   - `onCleanUpArtifacts` does not run
   - Any stale artifacts or stale build-info files remain, exactly like any other partial build

5. Explicit `files` cannot be combined with `--no-tests` or `--no-contracts`

   - If `files.length > 0` and either `--no-tests` or `--no-contracts` is used, the task throws

When `splitTestsCompilation === true`:

- current behavior is preserved
- The task builds contracts and tests in two separate passes
- `--no-tests` and `--no-contracts` skip a scope exactly as they do today
- Otherwise, explicit `files` are routed to the matching scope with `getScope()`
- Scope-specific cleanup remains unchanged

Both modes return:

```typescript
{
  contractRootPaths: string[];
  testRootPaths: string[];
}
```

The arrays always reflect the roots actually built by the task.

### Other Built-In Tasks That Call `build`

`run`, top-level `test`, and `console` currently compile only contracts by passing `noTests: true` to `build`.

When `splitTestsCompilation === false`:

- they must call `build()` without `noTests`
- they therefore compile Solidity tests too as part of the unified build

When `splitTestsCompilation === true`:

- current behavior is preserved
- they continue to pass `noTests: true`

### Solidity Test Runner (`hardhat test solidity`)

When `splitTestsCompilation === false`:

- `noCompile === true` skips compilation entirely
- `noCompile !== true` performs one full unified build
- `testFiles` only controls which tests are executed
- partial Solidity test runs may still compile all Solidity tests as a temporary limitation
- the runner must compute the selected test roots independently from the build return value
- when `noCompile === true`, selected test roots must still be validated against the compiled artifacts available on disk
- if a selected Solidity test file exists but has not been compiled, the task throws a `HardhatError`
- only the selected test roots are used for:
  - deciding which suites to execute
  - deprecated-test warnings
- artifacts and build info are read from a single directory: `getArtifactsDirectory("contracts")`

Important distinction in unified mode:

- compiled test roots: all test roots produced by the unified build
- executed test roots: the tests requested by the user, or all test roots when no specific `testFiles` are provided

When `splitTestsCompilation === true`, current behavior is preserved:

- the first build (contracts) is guarded by `noCompile`
- the second build (tests) is unconditional — Solidity tests are always compiled regardless of `--no-compile`
- this is intentional: in split mode, `--no-compile` means "do not compile contracts", not "skip all compilation"

### Warning Suppression — Unchanged

Warning suppression continues to identify test files by path and `.t.sol` suffix, independently of whether compilation is split.

### Coverage Plugin — Unchanged

The coverage plugin already uses `context.solidity.getScope(fsPath)` to skip test files. Since classification is unchanged, test files continue to be excluded from instrumentation in both modes.

### Gas Analytics — Unchanged

Gas analytics behavior is not affected by `splitTestsCompilation`.

- It does not depend on Solidity compile-time scope partitioning
- It operates on executed tests and their gas reports
- In unified mode, if a selected Solidity test run compiles more tests than it executes, gas analytics still reflects only the suites that actually ran
- Snapshot and snapshot-check behavior is unchanged

## `hardhat-typechain` package

### Type Generation

When `splitTestsCompilation === false`, unified builds run with `scope: "contracts"`, and `context.artifacts` sees both contract and test artifacts. TypeChain must therefore filter test artifacts before generating types.

Updated behavior:

- keep the existing `options?.scope === "tests"` early return
  - this preserves current split behavior
- after a successful build, collect all artifact paths from `context.artifacts`
- classify each artifact by its source file using `context.solidity.getScope()`:
  - derive the source file path from the artifact path by computing its path relative to `context.config.paths.artifacts` and resolving that against `context.config.paths.root`
  - this derivation works because of a known invariant in the artifact layout: each local Solidity source file produces a directory in the artifacts folder whose relative path from the artifacts root mirrors the source file's relative path from the project root
  - `getScope()` defaults to `"contracts"` for files that don't exist on disk, so non-local artifacts (e.g. npm dependencies) are never filtered out
- pass only contract-scope artifact paths to `generateTypes()`

Test artifacts never receive TypeChain output.

## `hardhat-mocha` package

When `splitTestsCompilation === false`:

- `noCompile === true` skips compilation entirely
- `noCompile !== true` calls `build()` without `noTests`
- JS/TS test runs therefore compile Solidity tests too as part of the unified build

When `splitTestsCompilation === true`, current behavior is preserved:

- `noCompile === true` skips compilation entirely
- `noCompile !== true` keeps calling `build({ noTests: true })`

## `hardhat-node-test-runner` package

When `splitTestsCompilation === false`:

- `noCompile === true` skips compilation entirely
- `noCompile !== true` calls `build()` without `noTests`
- JS/TS test runs therefore compile Solidity tests too as part of the unified build

When `splitTestsCompilation === true`, current behavior is preserved:

- `noCompile === true` skips compilation entirely
- `noCompile !== true` keeps calling `build({ noTests: true })`

## `hardhat-ignition` package

When `splitTestsCompilation === false`:

- `deploy` calls `build()` without `noTests`
- `deploy` still passes `quiet: true` and `defaultBuildProfile: "production"`
- `visualize` calls `build()` without `noTests`
- `visualize` still passes `quiet: true`
- these tasks therefore compile Solidity tests too as part of the unified build
- artifact resolution through `hre.artifacts` sees test artifacts too, so bare-name resolution and build-info lookup can become ambiguous in the same way as other artifact consumers

Note that by using `defaultBuildProfile: "production"` we still get isolated builds, so the extra tests being compiled won't be present in the deployed contract's build-info files.

When `splitTestsCompilation === true`, current behavior is preserved:

- `deploy` keeps calling `build({ noTests: true, quiet: true, defaultBuildProfile: "production" })`
- `visualize` keeps calling `build({ noTests: true, quiet: true })`

## Solidity Hooks Impact Summary

| Hook | Impact | Details |
| --- | --- | --- |
| `build` | Receives different scope/root files in unified mode | Full unified builds call the hook once with `scope: "contracts"` and mixed contract/test roots. Synthetic partial builds (`--no-tests`, `--no-contracts`) and explicit-file builds call it once with only the selected roots. Plugins that need contract-only behavior must filter per file with `getScope()`. |
| `preprocessProjectFileBeforeBuilding` | Mixed sources possible | In unified mode, the same compilation may include both contract and test files. Plugins can distinguish with `context.solidity.getScope(fsPath)`. |
| `preprocessSolcInputBeforeBuilding` | Mixed sources possible | In unified mode, `solcInput.sources` may contain both contract and test sources together. |
| `onCleanUpArtifacts` | Mixed artifact set, but only on full unified cleanup | In unified mode, this hook only runs for the full-build path. It receives mixed contract/test artifact paths. Partial builds do not trigger it. |
| `downloadCompilers` | No change | Compiler download is still driven by resolved compiler configs. |
| `getCompiler` | No change | Compiler selection is unchanged. |
| `invokeSolc` | No change | Compiler invocation remains scope-unaware. |
| `readSourceFile` | No change | File reading is unchanged. |
| `readNpmPackageRemappings` | No change | NPM remapping resolution is unchanged. |

## Unaffected areas

- `builtin:clean`: It deletes the `cache` and `artifacts` directories entirely, so it does not depend on how Solidity outputs were partitioned before cleanup.
- `builtin:telemetry`: It only exposes telemetry configuration tasks and does not interact with Solidity root discovery, build scopes, artifacts, or cleanup.
- `@nomicfoundation/hardhat-keystore`: It only adds config/configuration-variable hooks and keystore tasks. It does not compile Solidity or read artifacts.
- `@nomicfoundation/hardhat-ledger`: It only affects network/account configuration and request handling. It does not interact with Solidity build scopes or artifact layout.
- `@nomicfoundation/hardhat-network-helpers`: It only augments network connections with helper methods. It does not trigger builds, classify Solidity files, or consume artifacts/build info.
- `@nomicfoundation/hardhat-ethers-chai-matchers`: It only registers Chai matchers at network-connection time. It does not inspect build scopes, root-file discovery, or artifact trees itself.
- `@nomicfoundation/hardhat-viem-assertions`: It only registers viem assertion helpers at network-connection time. It does not inspect build scopes, root-file discovery, or artifact trees itself.

Toolbox packages are not listed separately because they are meta-plugins: they inherit whatever behavior changes apply to the plugins they bundle.

## Indirectly affected integrations

These packages do not define Solidity build scopes themselves, but they call APIs whose behavior changes in unified mode. They therefore inherit user-visible behavior changes even though they are not the source of the contracts-vs-tests split.

- `builtin:flatten`: `hardhat flatten` without explicit `files` calls `solidity.getRootFilePaths()` with the default scope. When `splitTestsCompilation === false`, that now returns both contract and test roots, so the default flatten target set expands to include Solidity tests. Explicit `files` behavior is unchanged.
- `builtin:network-manager`: the EDR contract decoder is initialized from all build infos visible through `context.artifacts`. In unified mode, once contract and test build infos live under the same artifacts tree, the decoder sees both. This does not change scope logic, but it means decoding/metadata availability follows the mixed artifact set on disk. This is inevitable if we want to unify the compilation. In a future iteration, Hardhat could tell EDR which files to ignore from each build info based on `getScope()`, but for now the decoder just sees everything.
- `builtin:node`: it inherits the `builtin:network-manager` behavior above because starting the node creates an EDR provider through `hre.network.connect()`. In unified mode, the node's decoder therefore sees the mixed build-info set. Its separate build-info watcher behavior is otherwise unchanged.
- `@nomicfoundation/hardhat-ethers`: its helpers resolve artifacts through `context.artifacts` / `hre.artifacts`. In unified mode, test artifacts are visible there too, so bare-name helpers like `getContractFactory`, `getContractAt`, and `deployContract` can now become ambiguous if a test contract and a contract share the same name. Fully qualified names continue to work. (\*)
- `@nomicfoundation/hardhat-viem`: same artifact-resolution effect as `@nomicfoundation/hardhat-ethers`. Bare-name helpers like `deployContract`, `sendDeploymentTransaction`, and `getContractAt` can now see test artifacts in unified mode, so ambiguity behavior may change. (\*)
- `@nomicfoundation/hardhat-verify`: explicit `--contract <fqn>` verification remains predictable, but inference mode scans `hre.artifacts.getAllFullyQualifiedNames()`. In unified mode that candidate set includes test artifacts too, so automatic contract inference and multiple-match errors can now involve test contracts. The mitigation remains to pass an explicit fully qualified name when inference becomes ambiguous.
- `@nomicfoundation/hardhat-ignition-ethers`: it adds no new scope logic of its own, but it inherits the dedicated `hardhat-ignition` behavior above and the `hardhat-ethers` behavior above.
- `@nomicfoundation/hardhat-ignition-viem`: it adds no new scope logic of its own, but it inherits the dedicated `hardhat-ignition` behavior above and the `hardhat-viem` behavior above.

(\*) Note that helper-level bare-name ambiguity errors provide enough information for users to fix the issue by switching to fully qualified names, so this is an accepted behavior change. If a user has a test contract that shares a name with a contract, they will need to disambiguate with fully qualified names when `splitTestsCompilation === false`. When `splitTestsCompilation === true`, this ambiguity cannot arise because test artifacts are stored separately and not visible to helpers that only look at the main artifacts directory.

Toolbox packages (`@nomicfoundation/hardhat-toolbox-mocha-ethers` and `@nomicfoundation/hardhat-toolbox-viem`) are still not listed separately as independent integration surfaces. They just re-export bundles of plugins, so they inherit the combined behavior changes of the plugins above.

---

# Part 2: Phased Implementation Plan

The implementation should be split into smaller phases so that each phase introduces one coherent behavior change and has its own validation surface.

## Phase 1: Config And Plumbing

Add the new config field, validate it, resolve it, and pass it through to the build-system constructor. No behavior changes yet.

### Changes

1. `packages/hardhat/src/internal/builtin-plugins/solidity/type-extensions.ts`

   - Add `splitTestsCompilation?: boolean` to `CommonSolidityUserConfig`
   - Add `splitTestsCompilation: boolean` to `SolidityConfig`
   - Add inline JSDoc explaining the field

2. `packages/hardhat/src/internal/builtin-plugins/solidity/config.ts`

   - Add `splitTestsCompilation: z.boolean().optional()` to all object-typed Solidity user-config schemas
   - Resolve object configs with `solidityConfig.splitTestsCompilation ?? false`
   - Resolve string and string-array configs with `false`

The build system accesses `splitTestsCompilation` through `this.#options.solidityConfig.splitTestsCompilation` — no separate field in `SolidityBuildSystemOptions` is needed since `solidityConfig` already carries the resolved value.

### Validation

- Run `pnpm lint` in `packages/hardhat`
- Run `pnpm build` in `packages/hardhat`
- Run existing config tests: `packages/hardhat/test/internal/builtin-plugins/solidity/config.ts`
- Add config tests for:
  - `splitTestsCompilation: true`
  - `splitTestsCompilation: false`
  - omitted field defaults to `false`
  - invalid non-boolean values fail validation
- Run `pnpm test` in `packages/hardhat`

## Phase 2: Build-System Core Semantics

Implement the new root-discovery, artifact-layout, cleanup, and low-level scope behavior in the Solidity build system.

### Changes

1. `packages/hardhat/src/internal/builtin-plugins/solidity/build-system/build-system.ts`

   - Update `getRootFilePaths()`:
     - in unified mode, `scope: "contracts"` returns all roots, including contract roots, test roots, and `npmFilesToBuild` roots
     - in unified mode, `scope: "tests"` throws
   - Update `getArtifactsDirectory()`:
     - in unified mode, both scopes return `artifactsPath`
   - Update `emitArtifacts()`:
     - emit all artifacts to the shared directory in unified mode
     - emit per-source `artifacts.d.ts` only for contract roots in unified `scope: "contracts"` builds
   - Update `cleanupArtifacts()`:
     - operate on the shared directory in unified mode
     - include test artifacts in duplicate-name detection
     - pass mixed artifact paths to `onCleanUpArtifacts` for unified contracts-scope cleanup
   - Reject unified low-level `scope: "tests"` calls in:
     - `build()`
     - `getCompilationJobs()`
     - `emitArtifacts()`
     - `cleanupArtifacts()`
   - Delete the scope-level type-file assertion in `#cacheCompilationResult()` (`scope === "tests" || typeFilePath !== undefined`). In unified mode, test roots under `scope: "contracts"` have no type file, so this assertion no longer holds. The cache entry already accepts `typeFilePath?: string` and the cache-hit path already skips `undefined` entries, so removing it is safe. Phase 3 replaces this with proper per-root output-layout validation.

2. `packages/hardhat/src/types/solidity/build-system.ts`

   - Update JSDoc on:
     - `getRootFilePaths()`
     - `emitArtifacts()`
     - `cleanupArtifacts()`
     - `getArtifactsDirectory()`
     - `BuildOptions.scope`
   - Document the unified-mode behavior and the new `getRootFilePaths({ scope: "tests" })` error

3. `packages/hardhat/src/internal/builtin-plugins/solidity/type-extensions.ts`

   - Update hook JSDoc for:
     - `build`
     - `onCleanUpArtifacts`
     - `preprocessProjectFileBeforeBuilding`
     - `preprocessSolcInputBeforeBuilding`

4. `packages/hardhat/src/internal/builtin-plugins/solidity/hook-handlers/hre.ts`
   - No changes needed — the existing `solidityConfig` field in `SolidityBuildSystemOptions` already carries the resolved `splitTestsCompilation` value

5. New `HardhatError`
   - Add an error code for calling `getRootFilePaths({ scope: "tests" })` when unified compilation is enabled
   - Use the first free code number in the `CORE.SOLIDITY` category in `packages/hardhat-errors/src/descriptors.ts`

6. `LazySolidityBuildSystem`
   - `LazySolidityBuildSystem` (in `packages/hardhat/src/internal/builtin-plugins/solidity/hook-handlers/hre.ts`) is a pure pass-through wrapper that delegates all calls to the underlying `SolidityBuildSystemImplementation`. It requires no changes itself — all new behavior is handled by the implementation it wraps.

### Validation

- Run `pnpm lint` in `packages/hardhat`
- Run `pnpm build` in `packages/hardhat`
- Run existing build-system and scope tests:
  - `packages/hardhat/test/internal/builtin-plugins/solidity/build-system/build-system.ts`
  - `packages/hardhat/test/internal/builtin-plugins/solidity/build-system/integration/build-scopes.ts`
- Add tests for:
  - unified `getRootFilePaths({ scope: "contracts" })` returns contract, test, and `npmFilesToBuild` roots together
  - unified `getRootFilePaths({ scope: "tests" })` throws
  - unified `getArtifactsDirectory("tests")` returns the main artifacts dir
  - unified `emitArtifacts()` skips type declarations for test roots
  - unified low-level `scope: "tests"` calls throw the new error for:
    - `build`
    - `getCompilationJobs`
    - `emitArtifacts`
    - `cleanupArtifacts`
  - unified contracts-scope cleanup includes test artifacts in duplicate-name handling
- Run `pnpm test` in `packages/hardhat`

## Phase 3: Compile Cache

Update the compile cache so cache hits remain correct and fast when the output layout changes.

### Changes

1. `packages/hardhat/src/internal/builtin-plugins/solidity/build-system/cache.ts`

   - Extend `CompileCacheEntry` with:
     - `artifactsDirectory`
     - `emitsTypeDeclarations`

2. `packages/hardhat/src/internal/builtin-plugins/solidity/build-system/build-system.ts`
   - Add an internal helper that computes the expected output layout for a root from:
     - `splitTestsCompilation`
     - build `scope`
     - root path classification
   - Use that helper during cache-hit validation before file existence checks
   - Treat cache entries missing the new fields as misses
   - Update `#cacheCompilationResult()` to store the per-root output layout

### Validation

- Run `pnpm lint` in `packages/hardhat`
- Run `pnpm build` in `packages/hardhat`
- Run existing partial-compilation tests:
  - `packages/hardhat/test/internal/builtin-plugins/solidity/build-system/partial-compilation/get-compilation-jobs-cache-hits.ts`
  - `packages/hardhat/test/internal/builtin-plugins/solidity/build-system/partial-compilation/cache-hit-results.ts`
  - `packages/hardhat/test/internal/builtin-plugins/solidity/build-system/partial-compilation/npm-cache-hits.ts`
- Add tests for:
  - unified-mode second builds cache-hit both contract and test roots
  - unified-mode test roots cache-hit correctly without type declarations
  - toggling `splitTestsCompilation` invalidates through output-layout mismatch
  - pre-existing cache entries without the new fields are treated as misses
- Run `pnpm test` in `packages/hardhat`

## Phase 4: Build Task Semantics

Rewrite the high-level build task to implement the new unified-mode semantics.

### Changes

1. `packages/hardhat/src/internal/builtin-plugins/solidity/tasks/build.ts`
   - Branch on `splitTestsCompilation`
   - Unified mode:
     - full build when no `files` and no scope-skipping flags
     - exact partial build when explicit `files` are provided
     - synthetic partial build of all contracts for `--no-tests`: call `getRootFilePaths({ scope: "contracts" })` to get all roots, filter to contract roots using `getScope()`, and pass them as `rootFilePaths` to `build()`
     - synthetic partial build of all tests for `--no-contracts`: call `getRootFilePaths({ scope: "contracts" })` to get all roots, filter to test roots using `getScope()`, and pass them as `rootFilePaths` to `build()`
     - all low-level `solidity.build()` and `solidity.cleanupArtifacts()` calls use `scope: "contracts"`, even when the selected roots are all tests
     - the task must never call low-level Solidity build-system APIs with `scope: "tests"` in unified mode
     - reject `files` combined with `--no-tests` or `--no-contracts`
     - cleanup runs only for the full unified build
   - Split mode:
     - preserve the current two-pass behavior
     - preserve the current explicit-file routing behavior
     - preserve the current unused-file validation after scope routing
   - Return `{ contractRootPaths, testRootPaths }` from the roots actually built, partitioning them with `getScope()`

### Validation

- Run `pnpm lint` in `packages/hardhat`
- Run `pnpm build` in `packages/hardhat`
- Run existing scope and cleanup tests:
  - `packages/hardhat/test/internal/builtin-plugins/solidity/build-system/integration/build-scopes.ts`
  - `packages/hardhat/test/internal/builtin-plugins/solidity/tasks/build-cleanup-artifacts.ts`
- Add tests for:
  - unified full build compiles contracts and tests together
  - unified explicit-file builds compile exactly the provided files
  - unified explicit-file builds still use low-level `scope: "contracts"`
  - unified explicit `files` + `--no-tests` throws
  - unified explicit `files` + `--no-contracts` throws
  - unified `--no-tests` behaves like a partial build over all contracts
  - unified `--no-contracts` behaves like a partial build over all tests
  - unified `--no-contracts` still uses low-level `scope: "contracts"`
  - unified `--no-tests` / `--no-contracts` do not run cleanup side effects
  - unified full-build cleanup still uses low-level `scope: "contracts"`
  - unified mode partitions returned `contractRootPaths` and `testRootPaths` with `getScope()` from the actual roots built
  - split mode preserves explicit contract-file builds with `--no-tests`
  - split mode preserves explicit test-file builds with `--no-contracts`
  - split mode preserves the current unused-file error when explicit files fall only in a disabled scope
  - other split-mode regressions for current behavior
- Run `pnpm test` in `packages/hardhat`

## Phase 5: Other Built-In Task Callers

Update the built-in tasks that currently call `build({ noTests: true })`.

### Changes

1. `packages/hardhat/src/internal/builtin-plugins/run/task-action.ts`

   - In unified mode, call plain `build()`
   - In split mode, keep `noTests: true`

2. `packages/hardhat/src/internal/builtin-plugins/test/task-action.ts`

   - In unified mode, call plain `build()`
   - In split mode, keep `noTests: true`

3. `packages/hardhat/src/internal/builtin-plugins/console/task-action.ts`
   - In unified mode, call plain `build()`
   - In split mode, keep `noTests: true`

### Validation

- Run `pnpm lint` in `packages/hardhat`
- Run `pnpm build` in `packages/hardhat`
- Run existing task tests:
  - `packages/hardhat/test/internal/builtin-plugins/run/task-action.ts`
  - `packages/hardhat/test/internal/builtin-plugins/test/task-action.ts`
  - `packages/hardhat/test/internal/builtin-plugins/console/task-action.ts`
- Add tests that verify build invocation arguments in both modes
- Run `pnpm test` in `packages/hardhat`

## Phase 6: Solidity Test Runner

Update the Solidity test runner for unified builds while preserving selected test execution.

### Changes

1. `packages/hardhat/src/internal/builtin-plugins/solidity-test/task-action.ts`
   - Branch on `hre.config.solidity.splitTestsCompilation`
   - Unified mode:
     - if `noCompile !== true`, call `build()` once without `noTests` or `noContracts`
     - compute selected test roots independently from the build return value
     - when `noCompile === true`, validate that every selected Solidity test root has compiled artifacts available
     - throw a `HardhatError` if a selected Solidity test file exists but was not compiled
     - use selected test roots for suite execution and deprecated-test warnings
     - read artifacts and build info from the main artifacts directory only
     - accept the temporary limitation that selected runs may still compile all Solidity tests
   - Split mode:
     - preserve the current two-build behavior

### Validation

- Run `pnpm lint` in `packages/hardhat`
- Run `pnpm build` in `packages/hardhat`
- Run existing Solidity test runner tests: `packages/hardhat/test/internal/builtin-plugins/solidity-test/task-action.ts`
- Add tests for:
  - unified mode performs one build
  - unified mode reads artifacts from a single directory
  - unified mode executes only the selected test files
  - a non-selected failing test may be compiled but is not executed
  - deprecated-test warnings are emitted only for selected tests
  - unified `noCompile === true` throws a `HardhatError` when a selected Solidity test file exists but has not been compiled
  - `noCompile === true` works in both modes
  - split-mode behavior remains unchanged
- Run `pnpm test` in `packages/hardhat`

## Phase 7: Artifact API Consumers And TypeChain

Lock in the accepted artifact-manager behavior change and update TypeChain.

### Changes

1. Hardhat package

   - No artifact-manager code changes are required beyond the shared-directory behavior introduced earlier
   - Add regressions that make the new behavior explicit

2. `packages/hardhat-typechain/src/internal/hook-handlers/solidity.ts`
   - Keep the existing `options?.scope === "tests"` early return
   - In unified mode, collect all artifact paths from `context.artifacts.getAllArtifactPaths()`
   - For each artifact path, classify its source file with `context.solidity.getScope()`
   - Pass only contract-scope artifact paths to `generateTypes()`
   - Do not infer "test artifact" from the artifact path layout alone

### Validation

- Run `pnpm lint` and `pnpm build` in `packages/hardhat`
- Run `pnpm lint` and `pnpm build` in `packages/hardhat-typechain`
- Run existing tests:
  - `packages/hardhat/test/internal/builtin-plugins/artifacts/artifact-manager.ts`
  - `packages/hardhat-typechain/test/index.ts`
- Add tests for:
  - unified `hre.artifacts.getAllArtifactPaths()` includes test artifacts
  - unified `hre.artifacts.getAllFullyQualifiedNames()` includes test artifacts
  - bare-name artifact lookup becomes ambiguous when a test contract and a contract share a name
  - fully qualified name lookup still works when a test contract and a contract share a name
  - test roots still do not get per-source `artifacts.d.ts`
  - TypeChain does not generate types for test artifacts in unified mode
  - TypeChain classifies artifacts with `context.solidity.getScope()` rather than artifact-path heuristics
  - TypeChain correctly classifies npm-dependency artifacts as contracts (since their source files don't exist on disk, `getScope()` defaults to `"contracts"`)
  - TypeChain still skips explicit test-scope builds in split mode
- Run `pnpm test` in `packages/hardhat`
- Run `pnpm test` in `packages/hardhat-typechain`

## Phase 8: `@nomicfoundation/hardhat-mocha`

Update the Mocha test runner plugin so its pre-test compilation matches the new unified-build semantics.

### Changes

1. `packages/hardhat-mocha/src/task-action.ts`
   - Branch on `hre.config.solidity.splitTestsCompilation`
   - When `noCompile === true`, preserve the current "skip compilation entirely" behavior
   - Unified mode:
     - call plain `build()` without `noTests`
   - Split mode:
     - preserve the current `build({ noTests: true })` behavior

### Validation

- Run `pnpm lint` in `packages/hardhat-mocha`
- Run `pnpm build` in `packages/hardhat-mocha`
- Run existing tests:
  - `packages/hardhat-mocha/test/index.ts`
  - `packages/hardhat-mocha/test/registerFileForTestRunner.ts`
- Add tests for:
  - unified mode invokes `build()` without `noTests`
  - split mode preserves `build({ noTests: true })`
  - `noCompile === true` skips compilation in both modes
- Run `pnpm test` in `packages/hardhat-mocha`

## Phase 9: `@nomicfoundation/hardhat-node-test-runner`

Update the node:test runner plugin so its pre-test compilation matches the new unified-build semantics.

### Changes

1. `packages/hardhat-node-test-runner/src/task-action.ts`
   - Branch on `hre.config.solidity.splitTestsCompilation`
   - When `noCompile === true`, preserve the current "skip compilation entirely" behavior
   - Unified mode:
     - call plain `build()` without `noTests`
   - Split mode:
     - preserve the current `build({ noTests: true })` behavior

### Validation

- Run `pnpm lint` in `packages/hardhat-node-test-runner`
- Run `pnpm build` in `packages/hardhat-node-test-runner`
- Run existing tests:
  - `packages/hardhat-node-test-runner/test/index.ts`
  - `packages/hardhat-node-test-runner/test/registerFileForTestRunner.ts`
- Add tests for:
  - unified mode invokes `build()` without `noTests`
  - split mode preserves `build({ noTests: true })`
  - `noCompile === true` skips compilation in both modes
- Run `pnpm test` in `packages/hardhat-node-test-runner`

## Phase 10: `@nomicfoundation/hardhat-ignition`

Update Ignition's task-level prebuild behavior so it matches the new unified-build semantics.

### Changes

1. `packages/hardhat-ignition/src/internal/tasks/deploy.ts`

   - Branch on `hre.config.solidity.splitTestsCompilation`
   - Unified mode:
     - call `build()` without `noTests`
     - preserve `quiet: true`
     - preserve `defaultBuildProfile: "production"`
   - Split mode:
     - preserve `build({ noTests: true, quiet: true, defaultBuildProfile: "production" })`

2. `packages/hardhat-ignition/src/internal/tasks/visualize.ts`
   - Branch on `hre.config.solidity.splitTestsCompilation`
   - Unified mode:
     - call `build()` without `noTests`
     - preserve `quiet: true`
   - Split mode:
     - preserve `build({ noTests: true, quiet: true })`

### Validation

- Run `pnpm lint` in `packages/hardhat-ignition`
- Run `pnpm build` in `packages/hardhat-ignition`
- Run existing tests:
  - `packages/hardhat-ignition/test/deploy/build-profile.ts`
  - `packages/hardhat-ignition/test/plan/index.ts`
- Add tests for:
  - unified `deploy` invokes `build()` without `noTests`
  - unified `deploy` still passes `defaultBuildProfile: "production"`
  - unified `visualize` invokes `build()` without `noTests`
  - split `deploy` preserves `build({ noTests: true, quiet: true, defaultBuildProfile: "production" })`
  - split `visualize` preserves `build({ noTests: true, quiet: true })`
- Run `pnpm test` in `packages/hardhat-ignition`

## Phase 11: Docs And Migration

Document the shipped behavior for plugin authors and future maintainers.

### Changes

1. `PLUGIN_MIGRATION_GUIDE.md`
   - Explain `splitTestsCompilation` and the new default
   - Document the unified `hre.artifacts` behavior change
   - Document the no-test-types rule for test artifacts
   - Document that low-level `scope: "tests"` Solidity build-system APIs throw when unified compilation is enabled
   - Document unified build-hook behavior
   - Document unified cleanup-hook behavior
   - Document the synthetic partial-build behavior of `--no-tests` and `--no-contracts`
   - Document that `run`, top-level `test`, `console`, `@nomicfoundation/hardhat-mocha`, and `@nomicfoundation/hardhat-node-test-runner` compile Solidity tests in unified mode
   - Document that `ignition deploy` and `ignition visualize` compile Solidity tests in unified mode
   - Document the accepted bare-name ambiguity changes for artifact consumers, including Ignition
   - Document the new compile-cache output-layout behavior
   - Provide before/after plugin examples where helpful

### Validation

- Review both documents against the implemented behavior
- Ensure all code examples compile and match the real API signatures
- Cross-check the docs against the final tests added in the earlier phases

# Plugin Migration Guide: `splitTestsCompilation`

## Overview

Hardhat 3 introduces a `splitTestsCompilation` config field that controls whether Solidity test files are compiled in a separate pass from contract files.

```typescript
export default {
  solidity: {
    version: "0.8.28",
    splitTestsCompilation: true, // opt in to the previous two-pass behavior
  },
};
```

- **Default: `false`** — contracts and tests are compiled together in a single pass under `scope: "contracts"`.
- **`true`** — contracts and tests are compiled in separate passes (the previous default behavior).

This guide covers what changes for plugin authors and how to adapt.

---

## Configuration

The field is accepted in all object-typed Solidity user configs (`SingleVersionSolidityUserConfig`, `MultiVersionSolidityUserConfig`, `BuildProfilesSolidityUserConfig`). String and string-array configs always resolve to `false`.

The resolved value is available at `hre.config.solidity.splitTestsCompilation`.

---

## Build System (`hre.solidity`)

### `scope: "tests"` is rejected when `splitTestsCompilation` is `false`

When `splitTestsCompilation` is `false`, tests are compiled together with contracts under `scope: "contracts"`. Using `scope: "tests"` is a logic error and throws `HardhatError` (code 916, `SOLIDITY.SPLIT_TESTS_COMPILATION_DISABLED`) in the following APIs:

- `hre.solidity.getRootFilePaths({ scope: "tests" })`
- `hre.solidity.build(rootFiles, { scope: "tests" })`
- `hre.solidity.getCompilationJobs(rootFiles, { scope: "tests" })`
- `hre.solidity.emitArtifacts(compilationJob, compilerOutput, { scope: "tests" })`
- `hre.solidity.cleanupArtifacts(rootFiles, { scope: "tests" })`

**Exception:** `hre.solidity.getArtifactsDirectory("tests")` does **not** throw. It returns the main artifacts path (same as `"contracts"`), since it is a read-only query with no side effects.

### `getRootFilePaths({ scope: "contracts" })`

When `splitTestsCompilation` is `false`, this returns **all** build roots — contract roots, test roots, and npm roots — together.

When `splitTestsCompilation` is `true`, it returns contract roots only (unchanged).

### `getArtifactsDirectory(scope)`

| `splitTestsCompilation` | `scope: "contracts"` | `scope: "tests"` |
| --- | --- | --- |
| `false` | `artifactsPath` | `artifactsPath` |
| `true` | `artifactsPath` | `cachePath/test-artifacts` |

### `emitArtifacts()`

When `splitTestsCompilation` is `false`:

- All artifacts go to the main artifacts directory.
- **Test roots do not get per-source `artifacts.d.ts` files.** Only contract roots emit TypeScript declarations.

### `cleanupArtifacts()`

When `splitTestsCompilation` is `false`:

- Cleanup operates on the main artifacts directory.
- Duplicate contract-name detection includes both contract and test artifacts.
- `onCleanUpArtifacts` receives the mixed contract/test artifact set.

### File classification is unchanged

`hre.solidity.getScope(fsPath)` continues to classify files as `"contracts"` or `"tests"` based on path and suffix rules. Use this API to distinguish contract files from test files when processing mixed sets.

---

## Build Task (`hardhat build` / `hardhat compile`)

### When `splitTestsCompilation` is `false`

The build task uses a **single compilation pass** under `scope: "contracts"`.

| Scenario | Behavior |
| --- | --- |
| Full build (no flags, no files) | Compiles all contract and test roots together. Runs cleanup. Regenerates top-level `artifacts.d.ts`. Fires `onCleanUpArtifacts`. |
| Explicit `files` | Partial build of exactly those files. No cleanup. No `artifacts.d.ts` regeneration. |
| `--no-tests` (no files) | Partial build of contract roots only. No cleanup. No `artifacts.d.ts` regeneration. |
| `--no-contracts` (no files) | Partial build of test roots only. No cleanup. No `artifacts.d.ts` regeneration. |
| `files` + compatible flag (e.g. contract files + `--no-tests`) | Partial build of the provided files. The flag filters out any incompatible roots from the resolved set. No cleanup. No `artifacts.d.ts` regeneration. |
| `files` + incompatible flag (e.g. test files + `--no-tests`) | Throws `INCOMPATIBLE_FILES_WITH_BUILD_FLAGS`. |

**Important:** `--no-tests` and `--no-contracts` behave as synthetic partial builds when `splitTestsCompilation` is `false`. This is different from `splitTestsCompilation: true`, where `--no-tests` runs a full contracts build with cleanup. Plugins that depend on cleanup running after `--no-tests` should account for this.

### When `splitTestsCompilation` is `true`

Current two-pass behavior is preserved. `--no-tests` and `--no-contracts` each skip one full pass with cleanup.

### Return value

Both modes return:

```typescript
{
  contractRootPaths: string[];
  testRootPaths: string[];
}
```

The arrays reflect the roots actually built, partitioned using `getScope()`.

---

## Artifact Manager (`hre.artifacts` / `context.artifacts`)

When `splitTestsCompilation` is `false`, both contract and test artifacts live under the same `paths.artifacts` directory. This means:

- `getAllArtifactPaths()` includes test artifacts.
- `getAllFullyQualifiedNames()` includes test artifacts.
- Bare-name lookup can become **ambiguous** if a test contract and a source contract share the same name. Ambiguous names type to `never` in the generated `artifacts.d.ts`.
- Fully qualified name lookup continues to work without ambiguity.

Plugins using `context.artifacts` must no longer assume that "artifacts path" means "contracts only."

### Filtering test artifacts

If your plugin needs contract-only artifacts, filter using `getScope()`:

```typescript
// Before (assumed contracts-only)
const artifactPaths = await context.artifacts.getAllArtifactPaths();

// After (explicit contract-only filtering)
const allArtifactPaths = await context.artifacts.getAllArtifactPaths();
const contractArtifactPaths = [];

for (const artifactPath of allArtifactPaths) {
  // Derive source path from artifact path using the layout invariant:
  // the artifact directory mirrors the source file's relative path from
  // the project root.
  const relativeFromArtifacts = path.relative(
    context.config.paths.artifacts,
    artifactPath,
  );
  const parts = relativeFromArtifacts.split(path.sep);
  const sourceRelative = parts.slice(0, -1).join(path.sep);
  const sourcePath = path.resolve(context.config.paths.root, sourceRelative);

  const scope = await context.solidity.getScope(sourcePath);
  if (scope === "contracts") {
    contractArtifactPaths.push(artifactPath);
  }
}
```

Note: `getScope()` defaults to `"contracts"` for files that don't exist on disk, so non-local artifacts (e.g. npm dependencies) are never filtered out.

---

## Solidity Hooks

### `build` hook

When `splitTestsCompilation` is `false`, full builds call the hook **once** with `scope: "contracts"` and a mixed set of contract and test roots. Plugins that need contract-only behavior must filter per file with `getScope()`.

### `preprocessProjectFileBeforeBuilding`

The same compilation may include both contract and test files. Plugins can distinguish with `context.solidity.getScope(fsPath)`.

### `preprocessSolcInputBeforeBuilding`

`solcInput.sources` may contain both contract and test sources together when `splitTestsCompilation` is `false`.

### `onCleanUpArtifacts`

When `splitTestsCompilation` is `false`, this hook only fires during full builds (not partial builds from `--no-tests`, `--no-contracts`, or explicit files). It receives mixed contract/test artifact paths.

### Unchanged hooks

`downloadCompilers`, `getCompiler`, `invokeSolc`, `readSourceFile`, and `readNpmPackageRemappings` are not affected.

---

## Compile Cache

Cache entries now store per-root output metadata (artifacts directory and whether a TypeScript declaration file was emitted). Toggling `splitTestsCompilation` invalidates cache hits through output-layout mismatch.

- Old cache entries without the new metadata are treated as misses.
- Toggling from `true` to `false` may leave an orphaned `cache/test-artifacts/` directory. This is cleaned up by `hardhat clean` but not by a regular build.

---

## Tasks That Call `build`

The following tasks adapt their `build()` call based on `splitTestsCompilation`:

| Task | `splitTestsCompilation: false` | `splitTestsCompilation: true` |
| --- | --- | --- |
| `hardhat run` | `build()` (compiles tests too) | `build({ noTests: true })` |
| `hardhat test` (top-level) | `build()` (compiles tests too) | `build({ noTests: true })` |
| `hardhat console` | `build()` (compiles tests too) | `build({ noTests: true })` |
| `hardhat test mocha` | `build()` (compiles tests too) | `build({ noTests: true })` |
| `hardhat test nodejs` | `build()` (compiles tests too) | `build({ noTests: true })` |
| `ignition deploy` | `build({ quiet, defaultBuildProfile: "production" })` | `build({ noTests: true, quiet, defaultBuildProfile: "production" })` |
| `ignition visualize` | `build({ quiet })` | `build({ noTests: true, quiet })` |

### Plugin pattern for calling `build`

If your plugin calls `build` and previously passed `noTests: true`, update it to branch on the config:

```typescript
// Before
await hre.tasks.getTask("build").run({ noTests: true });

// After
const noTests = hre.config.solidity.splitTestsCompilation;
await hre.tasks.getTask("build").run({ noTests });
```

---

## Solidity Test Runner (`hardhat test solidity`)

The Solidity test runner has its own compilation logic, separate from the task callers listed above.

### Early validation (both modes)

Before branching on `splitTestsCompilation`, the runner validates that all provided `testFiles` are classified as tests by `getScope()`. Non-test files throw `SELECTED_FILES_ARENT_SOLIDITY_TESTS`.

### When `splitTestsCompilation` is `false`

- `noCompile === true` skips compilation entirely. If a selected Solidity test file has not been compiled, the runner throws `SELECTED_TEST_FILES_NOT_COMPILED`.
- `noCompile !== true` calls `build({ files: testFiles })` once, without `noTests` or `noContracts`. When `testFiles` is empty this is a full build; otherwise a partial build of the specified files.
- The runner uses `testRootPaths` from the build return value to determine which tests to run.
- Artifacts and build info are read from a single directory: `getArtifactsDirectory("contracts")`.

### When `splitTestsCompilation` is `true`

Current two-build behavior is preserved:

- The first build (contracts) is guarded by `noCompile`.
- The second build (tests) is unconditional — Solidity tests are always compiled regardless of `--no-compile`.
- In split mode, `--no-compile` means "do not compile contracts", not "skip all compilation".

---

## TypeChain

TypeChain filters test artifacts before generating types when `splitTestsCompilation` is `false`. It uses `context.solidity.getScope()` to classify each artifact's source file and only generates types for contract-scope artifacts.

Test artifacts never receive TypeChain output regardless of the `splitTestsCompilation` setting.

---

## Bare-Name Ambiguity

When `splitTestsCompilation` is `false`, test artifacts are visible through `hre.artifacts`. This affects any API that resolves artifacts by bare contract name:

- `hardhat-ethers`: `getContractFactory`, `getContractAt`, `deployContract`
- `hardhat-viem`: `deployContract`, `sendDeploymentTransaction`, `getContractAt`
- `hardhat-verify`: automatic contract inference via `getAllFullyQualifiedNames()`
- `hardhat-ignition`: artifact resolution through `hre.artifacts`

If a test contract and a source contract share the same name, bare-name resolution becomes ambiguous. The fix is to use fully qualified names (e.g. `"contracts/Foo.sol:Foo"` instead of `"Foo"`).

When `splitTestsCompilation` is `true`, this ambiguity cannot arise because test artifacts are stored separately and not visible to helpers that only look at the main artifacts directory.

---

## Indirectly Affected Built-In Plugins

- **`hardhat flatten`**: Without explicit files, the default flatten target set expands to include Solidity tests when `splitTestsCompilation` is `false`.
- **`builtin:network-manager` / `builtin:node`**: The EDR contract decoder sees the mixed build-info set when contract and test build infos live under the same artifacts tree.

---

## Quick Checklist

- [ ] If your plugin calls `build({ noTests: true })`, switch to `const noTests = hre.config.solidity.splitTestsCompilation` and pass it through.
- [ ] If your plugin calls any low-level `hre.solidity` API with `scope: "tests"`, guard it with a `splitTestsCompilation` check or use `scope: "contracts"`.
- [ ] If your plugin reads from `context.artifacts` and assumes contracts-only, filter with `getScope()`.
- [ ] If your plugin handles the `build` hook and assumes contract-only roots, filter per file with `getScope()`.
- [ ] If your plugin handles `onCleanUpArtifacts`, be aware it receives mixed artifact paths and only fires on full builds when `splitTestsCompilation` is `false`.
- [ ] If your plugin resolves artifacts by bare name, document that users may need fully qualified names when test and contract names collide.

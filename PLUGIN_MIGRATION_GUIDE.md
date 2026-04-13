# Plugin Migration Guide: `splitTestsCompilation`

## Overview

This version of Hardhat introduces a `splitTestsCompilation` Solidity config field that controls whether Solidity test files are compiled in a separate pass from contract files. Previous to this version, they were always compiled separately.

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

## Configuration

The field is accepted in all object-typed Solidity user configs (`SingleVersionSolidityUserConfig`, `MultiVersionSolidityUserConfig`, `BuildProfilesSolidityUserConfig`). String and string-array configs always resolve to `false`.

The resolved value is available at `hre.config.solidity.splitTestsCompilation`.

## Build System (`hre.solidity`)

### `scope: "tests"` is rejected when `splitTestsCompilation` is `false`

When `splitTestsCompilation` is `false`, tests are compiled together with contracts under `scope: "contracts"`. Using `scope: "tests"` is a logic error and throws a `HardhatError` with descriptor `SOLIDITY.SPLIT_TESTS_COMPILATION_DISABLED` in the following APIs:

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

| `splitTestsCompilation` | `scope: "contracts"` | `scope: "tests"`           |
| ----------------------- | -------------------- | -------------------------- |
| `false`                 | `artifactsPath`      | `artifactsPath`            |
| `true`                  | `artifactsPath`      | `cachePath/test-artifacts` |

### File classification is unchanged

`hre.solidity.getScope(fsPath)` continues to classify files as `"contracts"` or `"tests"` based on path and suffix rules. Use this API to distinguish contract files from test files when processing mixed sets.

### `cleanupArtifacts()`

When `splitTestsCompilation` is `false`:

- Cleanup operates on the main artifacts directory.
- Duplicate contract-name detection runs across the mixed contract/test artifact set.
- `onCleanUpArtifacts` receives the mixed contract/test artifact set, so if you are hooking into it, you may need to adapt your Hook Handler. See below.

## Artifacts

When `splitTestsCompilation` is `false`, both contract and test artifacts live under the same `paths.artifacts` directory. This means:

- `getAllArtifactPaths()` includes test artifacts.
- `getAllFullyQualifiedNames()` includes test artifacts.
- Bare-name lookup can become **ambiguous** if a test contract and a source contract share the same name. Ambiguous names type to `never` in the generated `artifacts.d.ts`. Users hitting a collision should switch to fully qualified names (e.g. `"contracts/Foo.sol:Foo"` instead of `"Foo"`); this affects APIs like `hardhat-ethers`'s `getContractFactory` / `getContractAt` / `deployContract`, `hardhat-viem`'s `deployContract` / `getContractAt`, `hardhat-verify`'s automatic contract inference, and `hardhat-ignition`'s artifact resolution.
- Fully qualified name lookup continues to work without ambiguity.
- **Test roots do not get per-source `artifacts.d.ts` files.** Only contract roots emit TypeScript declarations. They are not part of the `ArtifactMap` interface from `hardhat/types/artifacts`.
  - This means that test contracts aren't part of the autocompletion in the `ethers` and `viem` plugins.

Plugins using `hre.artifacts` must no longer assume that "artifacts path" means "contracts only."

### Filtering test artifacts

You can take a look at the `hardhat-typechain` plugin to understand how to filter out the test artifacts.

## Build Task (`hardhat build` / `hardhat compile`)

### When `splitTestsCompilation` is `false`

The build task uses a **single compilation pass** under `scope: "contracts"`.

<!-- prettier-ignore -->
| Scenario                                                       | Behavior                                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Full build (no flags, no files)                                | Compiles all contracts and tests. Runs cleanup. Regenerates top-level `artifacts.d.ts`. Fires `onCleanUpArtifacts`.|
| Explicit `files`                                               | Partial build of exactly those files. No cleanup. No `artifacts.d.ts` regeneration. No `onCleanupArtifacts`.       |
| `--no-tests` (no files)                                        | Partial build of contract roots only. No cleanup. No `artifacts.d.ts` regeneration. No `onCleanupArtifacts`.       |
| `--no-contracts` (no files)                                    | Partial build of test roots only. No cleanup. No `artifacts.d.ts` regeneration. No `onCleanupArtifacts`.           |
| `files` + compatible flag (e.g. contract files + `--no-tests`) | Partial build of the provided files. No cleanup. No `artifacts.d.ts` regeneration. No `onCleanupArtifacts`.        |
| `files` + incompatible flag (e.g. test files + `--no-tests`)   | Throws `HardhatError` with descriptor `SOLIDITY.INCOMPATIBLE_FILES_WITH_BUILD_FLAGS`.                              |

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

### Plugin pattern for calling `build`

If your plugin calls `build` and previously passed `noTests: true`, update it to branch on the config. When `splitTestsCompilation` is `false` there is no cheap "contracts-only" pass to fall back to — skipping tests would require an extra partial build — so the flag is only meaningful in split mode:

```typescript
// Before
await hre.tasks.getTask("build").run({ noTests: true });

// After: only skip tests when they live in a separate compilation pass.
const noTests = hre.config.solidity.splitTestsCompilation;
await hre.tasks.getTask("build").run({ noTests });
```

## Solidity Hooks

### `build` hook

When `splitTestsCompilation` is `false`, full builds call the hook **once** with `scope: "contracts"` and a mixed set of contract and test roots. Plugins that need contract-only behavior must filter per file with `getScope()`.

### `preprocessProjectFileBeforeBuilding`

The same compilation may include both contract and test files. Plugins can distinguish with `context.solidity.getScope(fsPath)`.

### `preprocessSolcInputBeforeBuilding`

`solcInput.sources` may contain both contract and test sources together when `splitTestsCompilation` is `false`.

### `onCleanUpArtifacts`

When `splitTestsCompilation` is `false`, this hook only fires during full builds (not partial builds from `--no-tests`, `--no-contracts`, or explicit files). It receives mixed contract/test artifact paths. Take a look at the `hardhat-typechain` plugin for an example of how to filter out test artifacts.

### Unchanged hooks

`downloadCompilers`, `getCompiler`, `invokeSolc`, `readSourceFile`, and `readNpmPackageRemappings` are not affected.

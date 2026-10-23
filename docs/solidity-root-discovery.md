# Custom Solidity build roots

Plugins can use `solidity.isRootFile` to accept or exclude files while Hardhat scans `paths.sources.solidity` and `paths.tests.solidity`. The hook receives an absolute file path before the default `.sol` extension filter runs.

Use `solidity.getScope` to classify local files as `"contracts"` or `"tests"`. Both automatic discovery and explicitly requested files use this hook. Root discovery deduplicates files from overlapping directories before classifying them. The default scope rules give sources precedence over the tests directory; `.t.sol` files under a sources directory remain tests.

For example, the following Solidity hook handlers discover `.yul` files and classify them using the same path rules as `.sol` files:

```ts
import type { SolidityHooks } from "hardhat/types/hooks";

const handlers: Partial<SolidityHooks> = {
  isRootFile: async (context, fsPath, next) =>
    fsPath.endsWith(".yul") || (await next(context, fsPath)),
  getScope: async (context, fsPath, next) =>
    await next(context, fsPath.replace(/\.yul$/, ".sol")),
};
```

The path passed to `next` in the scope handler only changes the classification; it does not rename the file or change the path passed to the build hook. Handlers can call `next` to compose with other plugins and the default rules. Plugins that only customize discovery do not need to implement `getScope`.

Accepting a file does **not** add compiler support for its language. A plugin accepting Yul files must handle them in the existing `solidity.build` hook:

1. Separate the Yul roots from the Solidity roots.
2. Pass only Solidity roots to `next(context, solidityRoots, options)`.
3. Compile each standalone Yul root separately with `language: "Yul"`, and emit its artifacts and build info. Yul output has no ABI, so supply an empty ABI array for artifact consumers. Return the file build results together with the Solidity results.
4. Account for full-build artifact cleanup: passing only Solidity roots to `next` with cleanup enabled would remove existing Yul artifacts. A plugin can defer cleanup until all roots have been handled, then call `context.solidity.cleanupArtifacts(allRoots, { scope })`.

Artifacts must reference matching build-info and build-info-output files using a valid `buildInfoId`. Discovery hooks do not generate or manage those files. Plugins must also account for compiler settings, incremental builds, and the separate artifact directories in split compilation mode.

In unified compilation mode, `getRootFilePaths({ scope: "contracts" })` returns all roots. In split mode, each scope returns only its roots. Custom scope rules also apply to `--no-tests` and `--no-contracts`.

`isRootFile` does not filter explicit CLI paths or `npmFilesToBuild`. Explicit local paths are classified with `getScope`; npm roots remain contract roots. This means a build hook must handle explicitly requested custom files even if an `isRootFile` handler would exclude them from automatic discovery.

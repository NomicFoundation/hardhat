import type {
  HookContext,
  SolidityHooks,
} from "../../../../../src/types/hooks.js";
import type { HardhatPlugin } from "../../../../../src/types/plugins.js";
import type {
  BuildOptions,
  CompilationJobCreationError,
  FileBuildResult,
} from "../../../../../src/types/solidity/build-system.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { exists, remove } from "@nomicfoundation/hardhat-utils/fs";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";
import { useTestProjectTemplate } from "../build-system/resolver/helpers.js";

describe("build task - cleanupArtifacts", () => {
  describe("cleanupArtifacts uses built root files from results", () => {
    describe("when hook adds extra root files", () => {
      it("should keep artifacts for hook-added files", async () => {
        await using project = await useTestProjectTemplate({
          name: "test-cleanup-hook-adds",
          version: "1.0.0",
          files: {
            "contracts/Original.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Original {}`,
            "extra/AddedByHook.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract AddedByHook {}`,
          },
        });

        // Plugin that adds an extra file in the build hook
        const hookAddingPlugin: HardhatPlugin = {
          id: "test-hook-adding-plugin",
          hookHandlers: {
            solidity: async () => ({
              default: async () => {
                const handlers: Partial<SolidityHooks> = {
                  build: async (
                    context: HookContext,
                    rootFilePaths: string[],
                    options: BuildOptions | undefined,
                    next: (
                      nextContext: HookContext,
                      nextRootFilePaths: string[],
                      nextOptions: BuildOptions | undefined,
                    ) => Promise<
                      CompilationJobCreationError | Map<string, FileBuildResult>
                    >,
                  ) => {
                    // Find the AddedByHook.sol file and add it if not present
                    const extraFile = path.join(
                      project.path,
                      "extra/AddedByHook.sol",
                    );

                    // Add extra file to the build
                    const extendedPaths = rootFilePaths.some(
                      (p) => p === extraFile,
                    )
                      ? rootFilePaths
                      : [...rootFilePaths, extraFile];

                    return next(context, extendedPaths, options);
                  },
                };

                return handlers;
              },
            }),
          },
        };

        const hre = await createHardhatRuntimeEnvironment(
          {
            plugins: [hookAddingPlugin],
            solidity: "0.8.28",
          },
          {},
          project.path,
        );

        // Run full build
        await hre.tasks.getTask("build").run({
          force: true,
          noTests: true,
          quiet: true,
        });

        // Verify artifacts exist for both Original.sol and AddedByHook.sol
        const artifactsDir = path.join(project.path, "artifacts");
        const originalArtifact = path.join(
          artifactsDir,
          "contracts",
          "Original.sol",
          "Original.json",
        );
        const hookAddedArtifact = path.join(
          artifactsDir,
          "extra",
          "AddedByHook.sol",
          "AddedByHook.json",
        );

        assert.ok(
          await exists(originalArtifact),
          "Original.sol artifact should exist",
        );
        assert.ok(
          await exists(hookAddedArtifact),
          "AddedByHook.sol artifact should exist (added by hook)",
        );
      });
    });

    describe("when hook filters out root files", () => {
      it("should remove artifacts for filtered-out files on rebuild", async () => {
        await using project = await useTestProjectTemplate({
          name: "test-cleanup-hook-filters",
          version: "1.0.0",
          files: {
            "contracts/Keep.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Keep {}`,
            "contracts/Filter.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Filter {}`,
          },
        });

        // First, build without any filtering to create artifacts for both files
        const hreNoFilter = await createHardhatRuntimeEnvironment(
          {
            solidity: "0.8.28",
          },
          {},
          project.path,
        );

        await hreNoFilter.tasks.getTask("build").run({
          force: true,
          noTests: true,
          quiet: true,
        });

        // Verify both artifacts exist
        const artifactsDir = path.join(project.path, "artifacts", "contracts");
        const keepArtifact = path.join(artifactsDir, "Keep.sol", "Keep.json");
        const filterArtifact = path.join(
          artifactsDir,
          "Filter.sol",
          "Filter.json",
        );

        assert.ok(
          await exists(keepArtifact),
          "Keep.sol artifact should exist after first build",
        );
        assert.ok(
          await exists(filterArtifact),
          "Filter.sol artifact should exist after first build",
        );

        // Now rebuild with a plugin that filters out Filter.sol
        const filteringPlugin: HardhatPlugin = {
          id: "test-filtering-plugin",
          hookHandlers: {
            solidity: async () => ({
              default: async () => {
                const handlers: Partial<SolidityHooks> = {
                  build: async (
                    context: HookContext,
                    rootFilePaths: string[],
                    options: BuildOptions | undefined,
                    next: (
                      nextContext: HookContext,
                      nextRootFilePaths: string[],
                      nextOptions: BuildOptions | undefined,
                    ) => Promise<
                      CompilationJobCreationError | Map<string, FileBuildResult>
                    >,
                  ) => {
                    // Filter out Filter.sol
                    const filteredPaths = rootFilePaths.filter(
                      (p) => !p.includes("Filter"),
                    );
                    return next(context, filteredPaths, options);
                  },
                };

                return handlers;
              },
            }),
          },
        };

        const hreWithFilter = await createHardhatRuntimeEnvironment(
          {
            plugins: [filteringPlugin],
            solidity: "0.8.28",
          },
          {},
          project.path,
        );

        // Run full build with filtering
        await hreWithFilter.tasks.getTask("build").run({
          force: true,
          noTests: true,
          quiet: true,
        });

        // Keep.sol artifact should still exist
        assert.ok(
          await exists(keepArtifact),
          "Keep.sol artifact should exist after filtered build",
        );

        // Filter.sol artifact should be removed by cleanupArtifacts
        // because it was not in the build results
        assert.ok(
          !(await exists(filterArtifact)),
          "Filter.sol artifact should be removed after filtered build",
        );
      });
    });

    describe("basic full compilation", () => {
      it("should keep artifacts for all built files", async () => {
        await using project = await useTestProjectTemplate({
          name: "test-cleanup-basic",
          version: "1.0.0",
          files: {
            "contracts/First.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract First {}`,
            "contracts/Second.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Second {}`,
            "contracts/Third.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Third {}`,
          },
        });

        const hre = await createHardhatRuntimeEnvironment(
          {
            solidity: "0.8.28",
          },
          {},
          project.path,
        );

        // Run full build
        await hre.tasks.getTask("build").run({
          force: true,
          noTests: true,
          quiet: true,
        });

        // All three contracts should have artifacts
        const artifactsDir = path.join(project.path, "artifacts", "contracts");

        assert.ok(
          await exists(path.join(artifactsDir, "First.sol", "First.json")),
          "First.sol artifact should exist",
        );
        assert.ok(
          await exists(path.join(artifactsDir, "Second.sol", "Second.json")),
          "Second.sol artifact should exist",
        );
        assert.ok(
          await exists(path.join(artifactsDir, "Third.sol", "Third.json")),
          "Third.sol artifact should exist",
        );
      });

      it("should not run cleanupArtifacts for partial compilation", async () => {
        await using project = await useTestProjectTemplate({
          name: "test-cleanup-partial",
          version: "1.0.0",
          files: {
            "contracts/One.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract One {}`,
            "contracts/Two.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Two {}`,
          },
        });

        // First, build all files
        const hre = await createHardhatRuntimeEnvironment(
          {
            solidity: "0.8.28",
          },
          {},
          project.path,
        );

        await hre.tasks.getTask("build").run({
          force: true,
          noTests: true,
          quiet: true,
        });

        const artifactsDir = path.join(project.path, "artifacts", "contracts");
        const oneArtifact = path.join(artifactsDir, "One.sol", "One.json");
        const twoArtifact = path.join(artifactsDir, "Two.sol", "Two.json");

        assert.ok(
          await exists(oneArtifact),
          "One.sol artifact should exist after full build",
        );
        assert.ok(
          await exists(twoArtifact),
          "Two.sol artifact should exist after full build",
        );

        // Run partial build with only One.sol
        await hre.tasks.getTask("build").run({
          force: true,
          noTests: true,
          quiet: true,
          files: [path.join(project.path, "contracts/One.sol")],
        });

        // Both artifacts should still exist because cleanupArtifacts
        // is not called for partial compilation
        assert.ok(
          await exists(oneArtifact),
          "One.sol artifact should exist after partial build",
        );
        assert.ok(
          await exists(twoArtifact),
          "Two.sol artifact should still exist after partial build (cleanup not run)",
        );
      });
    });

    describe("stale artifact cleanup", () => {
      it("should remove artifacts for deleted source files on full rebuild", async () => {
        await using project = await useTestProjectTemplate({
          name: "test-cleanup-stale",
          version: "1.0.0",
          files: {
            "contracts/Permanent.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Permanent {}`,
            "contracts/ToDelete.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract ToDelete {}`,
          },
        });

        // First, build all files
        const hre = await createHardhatRuntimeEnvironment(
          {
            solidity: "0.8.28",
          },
          {},
          project.path,
        );

        await hre.tasks.getTask("build").run({
          force: true,
          noTests: true,
          quiet: true,
        });

        const artifactsDir = path.join(project.path, "artifacts", "contracts");
        const permanentArtifact = path.join(
          artifactsDir,
          "Permanent.sol",
          "Permanent.json",
        );
        const toDeleteArtifact = path.join(
          artifactsDir,
          "ToDelete.sol",
          "ToDelete.json",
        );

        assert.ok(
          await exists(permanentArtifact),
          "Permanent.sol artifact should exist",
        );
        assert.ok(
          await exists(toDeleteArtifact),
          "ToDelete.sol artifact should exist",
        );

        // Delete the source file
        await remove(path.join(project.path, "contracts/ToDelete.sol"));

        // Rebuild
        await hre.tasks.getTask("build").run({
          force: true,
          noTests: true,
          quiet: true,
        });

        // Permanent artifact should exist, ToDelete should be cleaned up
        assert.ok(
          await exists(permanentArtifact),
          "Permanent.sol artifact should still exist after rebuild",
        );
        assert.ok(
          !(await exists(toDeleteArtifact)),
          "ToDelete.sol artifact should be removed after source file deleted",
        );
      });
    });
  });
});

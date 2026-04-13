import type { CompileCache } from "../../../../../../src/internal/builtin-plugins/solidity/build-system/cache.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { readJsonFile, writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";

import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";
import { FileBuildResultType } from "../../../../../../src/types/solidity/build-system.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

import { getHRE } from "./helpers.js";

const CACHE_FILE = "compile-cache.json";

/**
 * Creates an HRE for a given project with the specified splitTestsCompilation
 * config value.
 */
async function getHREWithSplitConfig(
  projectPath: string,
  splitTestsCompilation: boolean,
) {
  return createHardhatRuntimeEnvironment(
    {
      solidity: {
        profiles: {
          default: { version: "0.8.30", isolated: false },
          production: { version: "0.8.30", isolated: true },
        },
        splitTestsCompilation,
      },
    },
    {},
    projectPath,
  );
}

describe("Compile cache output layout", () => {
  describe("unified mode", () => {
    it("should cache-hit both contract and test roots on second build", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {
          "contracts/Foo.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo {}`,
          "test/FooTest.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract FooTest {}`,
        },
      });

      const hre = await getHRE(project);
      const contractPath = path.join(project.path, "contracts/Foo.sol");
      const testPath = path.join(project.path, "test/FooTest.sol");

      // First build
      const firstResult = await hre.solidity.build([contractPath, testPath], {
        quiet: true,
      });
      assert(
        hre.solidity.isSuccessfulBuildResult(firstResult),
        "First build should succeed",
      );
      assert.equal(
        firstResult.get(contractPath)?.type,
        FileBuildResultType.BUILD_SUCCESS,
      );
      assert.equal(
        firstResult.get(testPath)?.type,
        FileBuildResultType.BUILD_SUCCESS,
      );

      // Second build - both should be cache hits
      const secondResult = await hre.solidity.build([contractPath, testPath], {
        quiet: true,
      });
      assert(
        hre.solidity.isSuccessfulBuildResult(secondResult),
        "Second build should succeed",
      );
      assert.equal(
        secondResult.get(contractPath)?.type,
        FileBuildResultType.CACHE_HIT,
      );
      assert.equal(
        secondResult.get(testPath)?.type,
        FileBuildResultType.CACHE_HIT,
      );
    });

    it("should cache-hit test roots correctly without type declarations", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {
          "contracts/Foo.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo {}`,
          "test/FooTest.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract FooTest {}`,
        },
      });

      const hre = await getHRE(project);
      const contractPath = path.join(project.path, "contracts/Foo.sol");
      const testPath = path.join(project.path, "test/FooTest.sol");

      // First build
      await hre.solidity.build([contractPath, testPath], { quiet: true });

      // Verify cache entry for test root has emitsTypeDeclarations: false
      const cachePath = path.join(project.path, "cache", CACHE_FILE);
      const cache: CompileCache = await readJsonFile(cachePath);
      const testEntry = cache[testPath];
      assert.notEqual(testEntry, undefined, "Test entry should exist in cache");
      assert.equal(
        testEntry.emitsTypeDeclarations,
        false,
        "Test root should not emit type declarations",
      );
      assert.equal(
        testEntry.typeFilePath,
        undefined,
        "Test root should have no typeFilePath",
      );

      // Verify contract root has emitsTypeDeclarations: true
      const contractEntry = cache[contractPath];
      assert.notEqual(
        contractEntry,
        undefined,
        "Contract entry should exist in cache",
      );
      assert.equal(
        contractEntry.emitsTypeDeclarations,
        true,
        "Contract root should emit type declarations",
      );

      // Second build - test root should still be a cache hit
      const secondResult = await hre.solidity.build([contractPath, testPath], {
        quiet: true,
      });
      assert(
        hre.solidity.isSuccessfulBuildResult(secondResult),
        "Second build should succeed",
      );
      assert.equal(
        secondResult.get(testPath)?.type,
        FileBuildResultType.CACHE_HIT,
      );
    });

    it("should store artifactsDirectory in cache entries", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {
          "contracts/Foo.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo {}`,
        },
      });

      const hre = await getHRE(project);
      const filePath = path.join(project.path, "contracts/Foo.sol");

      await hre.solidity.build([filePath], { quiet: true });

      const cachePath = path.join(project.path, "cache", CACHE_FILE);
      const cache: CompileCache = await readJsonFile(cachePath);
      const entry = cache[filePath];
      assert.notEqual(entry, undefined, "Entry should exist in cache");
      assert.equal(
        entry.artifactsDirectory,
        path.join(project.path, "artifacts"),
        "Artifacts directory should be the main artifacts path",
      );
    });
  });

  describe("toggling splitTestsCompilation", () => {
    it("should cache-hit contract roots when switching from split to unified (layout unchanged)", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {
          "contracts/Foo.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo {}`,
        },
      });

      // Build with split mode
      const hreSplit = await getHREWithSplitConfig(project.path, true);
      const filePath = path.join(project.path, "contracts/Foo.sol");
      await hreSplit.solidity.build([filePath], {
        quiet: true,
        scope: "contracts",
      });

      // Verify cache hit in split mode
      const splitResult2 = await hreSplit.solidity.build([filePath], {
        quiet: true,
        scope: "contracts",
      });
      assert(
        hreSplit.solidity.isSuccessfulBuildResult(splitResult2),
        "Split mode second build should succeed",
      );
      assert.equal(
        splitResult2.get(filePath)?.type,
        FileBuildResultType.CACHE_HIT,
      );

      // Switch to unified mode - for contracts in contracts scope, both modes
      // have the same artifactsDir and emitsTypeDeclarations=true, so this
      // case produces a cache hit. The invalidation matters for test roots
      // (tested separately below).
      const hreUnified = await getHREWithSplitConfig(project.path, false);
      const unifiedResult = await hreUnified.solidity.build([filePath], {
        quiet: true,
      });
      assert(
        hreUnified.solidity.isSuccessfulBuildResult(unifiedResult),
        "Unified mode build should succeed",
      );
      assert.equal(
        unifiedResult.get(filePath)?.type,
        FileBuildResultType.CACHE_HIT,
      );
    });

    it("should invalidate test root cache when switching from split to unified", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {
          "contracts/Foo.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo {}`,
          "test/FooTest.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract FooTest {}`,
        },
      });

      const testPath = path.join(project.path, "test/FooTest.sol");

      // Build test in split mode (scope: "tests")
      const hreSplit = await getHREWithSplitConfig(project.path, true);
      await hreSplit.solidity.build([testPath], {
        quiet: true,
        scope: "tests",
      });

      // Verify cache hit in split mode
      const splitResult2 = await hreSplit.solidity.build([testPath], {
        quiet: true,
        scope: "tests",
      });
      assert(
        hreSplit.solidity.isSuccessfulBuildResult(splitResult2),
        "Split mode second build should succeed",
      );
      assert.equal(
        splitResult2.get(testPath)?.type,
        FileBuildResultType.CACHE_HIT,
      );

      // Switch to unified mode and build with scope: "contracts"
      // The test root should be a cache miss because:
      // - artifactsDirectory changed (from cache/test-artifacts to artifacts)
      // - emitsTypeDeclarations is still false
      const hreUnified = await getHREWithSplitConfig(project.path, false);
      const contractPath = path.join(project.path, "contracts/Foo.sol");
      const unifiedResult = await hreUnified.solidity.build(
        [contractPath, testPath],
        { quiet: true },
      );
      assert(
        hreUnified.solidity.isSuccessfulBuildResult(unifiedResult),
        "Unified mode build should succeed",
      );
      assert.equal(
        unifiedResult.get(testPath)?.type,
        FileBuildResultType.BUILD_SUCCESS,
        "Test root should be recompiled after switching to unified mode",
      );
    });
  });

  describe("pre-existing cache entries without output layout fields", () => {
    it("should treat entries missing artifactsDirectory as cache misses", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {
          "contracts/Foo.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo {}`,
        },
      });

      const hre = await getHRE(project);
      const filePath = path.join(project.path, "contracts/Foo.sol");

      // First build to populate cache
      await hre.solidity.build([filePath], { quiet: true });

      // Remove only artifactsDirectory to simulate partial old format; the
      // next test covers the missing-emitsTypeDeclarations case.
      const cachePath = path.join(project.path, "cache", CACHE_FILE);
      const cache: Record<string, Record<string, unknown>> = await readJsonFile(
        cachePath,
      );
      for (const key of Object.keys(cache)) {
        delete cache[key].artifactsDirectory;
      }
      await writeJsonFile(cachePath, cache);

      // Second build should be a cache miss
      const result = await hre.solidity.build([filePath], { quiet: true });
      assert(
        hre.solidity.isSuccessfulBuildResult(result),
        "Build should succeed",
      );
      assert.equal(
        result.get(filePath)?.type,
        FileBuildResultType.BUILD_SUCCESS,
        "Should recompile when artifactsDirectory is missing from cache",
      );
    });

    it("should treat entries missing emitsTypeDeclarations as cache misses", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {
          "contracts/Foo.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo {}`,
        },
      });

      const hre = await getHRE(project);
      const filePath = path.join(project.path, "contracts/Foo.sol");

      // First build to populate cache
      await hre.solidity.build([filePath], { quiet: true });

      // Remove only emitsTypeDeclarations to simulate partial old format
      const cachePath = path.join(project.path, "cache", CACHE_FILE);
      const cache: Record<string, Record<string, unknown>> = await readJsonFile(
        cachePath,
      );
      for (const key of Object.keys(cache)) {
        delete cache[key].emitsTypeDeclarations;
      }
      await writeJsonFile(cachePath, cache);

      // Second build should be a cache miss
      const result = await hre.solidity.build([filePath], { quiet: true });
      assert(
        hre.solidity.isSuccessfulBuildResult(result),
        "Build should succeed",
      );
      assert.equal(
        result.get(filePath)?.type,
        FileBuildResultType.BUILD_SUCCESS,
        "Should recompile when emitsTypeDeclarations is missing from cache",
      );
    });
  });
});

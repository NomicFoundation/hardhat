import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { FileBuildResultType } from "../../../../../../src/types/solidity/build-system.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

import { getHRE } from "./helpers.js";

describe("CacheHitFileBuildResult", () => {
  describe("build() cache hit results", () => {
    it("should return CacheHitFileBuildResult with buildId string on cache hit", async () => {
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

      // First build
      const firstResult = await hre.solidity.build([filePath], { quiet: true });
      assert(!("reason" in firstResult), "First build should succeed");
      const firstBuildResult = firstResult.get(filePath);
      assert.equal(firstBuildResult?.type, FileBuildResultType.BUILD_SUCCESS);
      const originalBuildId =
        await firstBuildResult.compilationJob.getBuildId();

      // Second build - cache hit
      const secondResult = await hre.solidity.build([filePath], {
        quiet: true,
      });
      assert(!("reason" in secondResult), "Second build should succeed");
      const cacheHitResult = secondResult.get(filePath);

      assert.equal(cacheHitResult?.type, FileBuildResultType.CACHE_HIT);
      assert.equal(
        typeof cacheHitResult.buildId,
        "string",
        "buildId should be a string",
      );
      assert.equal(
        cacheHitResult.buildId,
        originalBuildId,
        "buildId should match original",
      );
    });

    it("should include contractArtifactsGenerated in cache hit result", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {
          "contracts/Foo.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo {}
contract Bar {}`,
        },
      });

      const hre = await getHRE(project);
      const filePath = path.join(project.path, "contracts/Foo.sol");

      // First build
      await hre.solidity.build([filePath], { quiet: true });

      // Second build - cache hit
      const secondResult = await hre.solidity.build([filePath], {
        quiet: true,
      });
      assert(!("reason" in secondResult), "Second build should succeed");
      const cacheHitResult = secondResult.get(filePath);

      assert.equal(cacheHitResult?.type, FileBuildResultType.CACHE_HIT);
      assert.equal(
        cacheHitResult.contractArtifactsGenerated.length,
        2,
        "Should have 2 artifacts (Foo, Bar)",
      );
    });

    it("should return BUILD_SUCCESS for modified file, CACHE_HIT for unchanged", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {
          "contracts/Foo.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo {}`,
          "contracts/Bar.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Bar {}`,
        },
      });

      const hre = await getHRE(project);
      const fooPath = path.join(project.path, "contracts/Foo.sol");
      const barPath = path.join(project.path, "contracts/Bar.sol");

      // First build
      await hre.solidity.build([fooPath, barPath], { quiet: true });

      // Modify only Foo.sol
      await writeFile(
        fooPath,
        `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo { uint256 public value; }`,
      );

      // Second build
      const result = await hre.solidity.build([fooPath, barPath], {
        quiet: true,
      });
      assert(!("reason" in result), "Build should succeed");

      assert.equal(
        result.get(fooPath)?.type,
        FileBuildResultType.BUILD_SUCCESS,
      );
      assert.equal(result.get(barPath)?.type, FileBuildResultType.CACHE_HIT);
    });

    it("should return BUILD_SUCCESS with force: true even for unchanged files", async () => {
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

      // First build
      await hre.solidity.build([filePath], { quiet: true });

      // Second build with force: true
      const result = await hre.solidity.build([filePath], {
        quiet: true,
        force: true,
      });
      assert(!("reason" in result), "Build should succeed");

      assert.equal(
        result.get(filePath)?.type,
        FileBuildResultType.BUILD_SUCCESS,
      );
    });
  });
});

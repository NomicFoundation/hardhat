import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { FileBuildResultType } from "../../../../../../src/types/solidity/build-system.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

import { getHRE } from "./helpers.js";

describe("npm file cache hits", () => {
  describe("build() with npm files", () => {
    it("should return CACHE_HIT for unchanged npm file on second build", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {},
        dependencies: {
          "@openzeppelin/contracts": {
            name: "@openzeppelin/contracts",
            version: "5.0.0",
            files: {
              "token/ERC20.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract ERC20 {}`,
            },
            exports: {
              "./*": "./*",
              "./token/*": "./token/*",
            },
          },
        },
      });

      const hre = await getHRE(project);

      const npmRootPath = "npm:@openzeppelin/contracts/token/ERC20.sol";

      // First build
      const firstResult = await hre.solidity.build([npmRootPath], {
        quiet: true,
      });

      assert(
        !("reason" in firstResult),
        `Build should be successful, got: ${JSON.stringify(firstResult)}`,
      );
      assert.equal(firstResult.size, 1, "Should have one result");
      const firstBuildResult = firstResult.get(npmRootPath);
      assert.equal(
        firstBuildResult?.type,
        FileBuildResultType.BUILD_SUCCESS,
        "First build should be BUILD_SUCCESS",
      );

      // Second build without changes - should be cache hit
      const secondResult = await hre.solidity.build([npmRootPath], {
        quiet: true,
      });

      assert(!("reason" in secondResult), "Second build should be successful");
      assert.equal(secondResult.size, 1, "Should have one result");
      const secondBuildResult = secondResult.get(npmRootPath);
      assert.equal(
        secondBuildResult?.type,
        FileBuildResultType.CACHE_HIT,
        "Second build should be CACHE_HIT",
      );
    });

    it("should return correct buildId for npm file cache hit", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {},
        dependencies: {
          "@openzeppelin/contracts": {
            name: "@openzeppelin/contracts",
            version: "5.0.0",
            files: {
              "token/ERC20.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract ERC20 {}`,
            },
            exports: {
              "./*": "./*",
              "./token/*": "./token/*",
            },
          },
        },
      });

      const hre = await getHRE(project);

      const npmRootPath = "npm:@openzeppelin/contracts/token/ERC20.sol";

      // First build
      const firstResult = await hre.solidity.build([npmRootPath], {
        quiet: true,
      });
      assert(!("reason" in firstResult), "First build should be successful");
      const firstBuildResult = firstResult.get(npmRootPath);
      assert.equal(firstBuildResult?.type, FileBuildResultType.BUILD_SUCCESS);
      const originalBuildId =
        await firstBuildResult.compilationJob.getBuildId();

      // Second build - cache hit
      const secondResult = await hre.solidity.build([npmRootPath], {
        quiet: true,
      });

      assert(!("reason" in secondResult), "Second build should be successful");
      const secondBuildResult = secondResult.get(npmRootPath);
      assert.equal(secondBuildResult?.type, FileBuildResultType.CACHE_HIT);
      assert.equal(
        secondBuildResult.buildId,
        originalBuildId,
        "Cache hit buildId should match original compilation",
      );
    });

    it("should handle mixed local and npm file cache hits", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {
          "contracts/Foo.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo {}`,
        },
        dependencies: {
          "@openzeppelin/contracts": {
            name: "@openzeppelin/contracts",
            version: "5.0.0",
            files: {
              "token/ERC20.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract ERC20 {}`,
            },
            exports: {
              "./*": "./*",
              "./token/*": "./token/*",
            },
          },
        },
      });

      const hre = await getHRE(project);

      const localPath = path.join(project.path, "contracts/Foo.sol");
      const npmRootPath = "npm:@openzeppelin/contracts/token/ERC20.sol";

      // First build both files
      const firstResult = await hre.solidity.build([localPath, npmRootPath], {
        quiet: true,
      });

      assert(!("reason" in firstResult), "First build should be successful");
      assert.equal(firstResult.size, 2, "Should have two results");

      // Modify only local file
      await writeFile(
        localPath,
        `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo { uint256 public value; }`,
      );

      // Second build
      const secondResult = await hre.solidity.build([localPath, npmRootPath], {
        quiet: true,
      });

      assert(!("reason" in secondResult), "Second build should be successful");
      assert.equal(secondResult.size, 2, "Should have two results");

      // Local file was modified - BUILD_SUCCESS
      const localResult = secondResult.get(localPath);
      assert.equal(
        localResult?.type,
        FileBuildResultType.BUILD_SUCCESS,
        "Modified local file should be BUILD_SUCCESS",
      );

      // npm file unchanged - CACHE_HIT
      const npmResult = secondResult.get(npmRootPath);
      assert.equal(
        npmResult?.type,
        FileBuildResultType.CACHE_HIT,
        "Unchanged npm file should be CACHE_HIT",
      );
    });
  });

  describe("getCompilationJobs() with npm files", () => {
    it("should return npm file in cacheHits when unchanged", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {},
        dependencies: {
          "@openzeppelin/contracts": {
            name: "@openzeppelin/contracts",
            version: "5.0.0",
            files: {
              "token/ERC20.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract ERC20 {}`,
            },
            exports: {
              "./*": "./*",
              "./token/*": "./token/*",
            },
          },
        },
      });

      const hre = await getHRE(project);

      const npmRootPath = "npm:@openzeppelin/contracts/token/ERC20.sol";

      // First build to populate cache
      await hre.solidity.build([npmRootPath], { quiet: true });

      // Call getCompilationJobs
      const result = await hre.solidity.getCompilationJobs([npmRootPath], {
        quiet: true,
      });

      assert(!("reason" in result), "getCompilationJobs should succeed");
      assert.equal(
        result.cacheHits.size,
        1,
        "Should have one cache hit for unchanged npm file",
      );
      assert.equal(
        result.compilationJobsPerFile.size,
        0,
        "Should have no compilation jobs for unchanged npm file",
      );
      assert(
        result.cacheHits.has(npmRootPath),
        "Cache hit should be keyed by npm root path",
      );
    });

    it("should return correct CacheHitInfo for npm file", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {},
        dependencies: {
          "@openzeppelin/contracts": {
            name: "@openzeppelin/contracts",
            version: "5.0.0",
            files: {
              "token/ERC20.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract ERC20 {}`,
            },
            exports: {
              "./*": "./*",
              "./token/*": "./token/*",
            },
          },
        },
      });

      const hre = await getHRE(project);

      const npmRootPath = "npm:@openzeppelin/contracts/token/ERC20.sol";

      // First build to get the original buildId
      const buildResult = await hre.solidity.build([npmRootPath], {
        quiet: true,
      });
      assert(!("reason" in buildResult), "Build should succeed");
      const fileBuildResult = buildResult.get(npmRootPath);
      assert.equal(fileBuildResult?.type, FileBuildResultType.BUILD_SUCCESS);
      const originalBuildId = await fileBuildResult.compilationJob.getBuildId();

      // Call getCompilationJobs
      const result = await hre.solidity.getCompilationJobs([npmRootPath], {
        quiet: true,
      });

      assert(!("reason" in result), "getCompilationJobs should succeed");
      const cacheHitInfo = result.cacheHits.get(npmRootPath);

      assert(cacheHitInfo !== undefined, "Should have cache hit info");
      assert.equal(
        cacheHitInfo.buildId,
        originalBuildId,
        "Cache hit buildId should match original compilation buildId",
      );
      assert(
        Array.isArray(cacheHitInfo.artifactPaths),
        "artifactPaths should be an array",
      );
      assert.equal(
        cacheHitInfo.artifactPaths.length,
        1,
        "Should have one artifact path for ERC20 contract",
      );
    });

    it("should handle mixed local and npm files correctly", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {
          "contracts/Foo.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo {}`,
        },
        dependencies: {
          "@openzeppelin/contracts": {
            name: "@openzeppelin/contracts",
            version: "5.0.0",
            files: {
              "token/ERC20.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract ERC20 {}`,
            },
            exports: {
              "./*": "./*",
              "./token/*": "./token/*",
            },
          },
        },
      });

      const hre = await getHRE(project);

      const localPath = path.join(project.path, "contracts/Foo.sol");
      const npmRootPath = "npm:@openzeppelin/contracts/token/ERC20.sol";

      // First build to populate cache
      await hre.solidity.build([localPath, npmRootPath], { quiet: true });

      // Modify only local file
      await writeFile(
        localPath,
        `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo { uint256 public value; }`,
      );

      // Call getCompilationJobs
      const result = await hre.solidity.getCompilationJobs(
        [localPath, npmRootPath],
        { quiet: true },
      );

      assert(!("reason" in result), "getCompilationJobs should succeed");

      // Local file was modified, should be in compilationJobsPerFile
      assert(
        result.compilationJobsPerFile.has(localPath),
        "Modified local file should be in compilationJobsPerFile",
      );

      // npm file unchanged, should be in cacheHits
      assert(
        result.cacheHits.has(npmRootPath),
        "Unchanged npm file should be in cacheHits",
      );

      assert.equal(
        result.compilationJobsPerFile.size,
        1,
        "Should have one compilation job",
      );
      assert.equal(result.cacheHits.size, 1, "Should have one cache hit");
    });

    it("should return npm file in compilationJobsPerFile with force: true", async () => {
      await using project = await useTestProjectTemplate({
        name: "test-project",
        version: "1.0.0",
        files: {},
        dependencies: {
          "@openzeppelin/contracts": {
            name: "@openzeppelin/contracts",
            version: "5.0.0",
            files: {
              "token/ERC20.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract ERC20 {}`,
            },
            exports: {
              "./*": "./*",
              "./token/*": "./token/*",
            },
          },
        },
      });

      const hre = await getHRE(project);

      const npmRootPath = "npm:@openzeppelin/contracts/token/ERC20.sol";

      // First build to populate cache
      await hre.solidity.build([npmRootPath], { quiet: true });

      // Call getCompilationJobs with force: true
      const result = await hre.solidity.getCompilationJobs([npmRootPath], {
        quiet: true,
        force: true,
      });

      assert(!("reason" in result), "getCompilationJobs should succeed");
      assert.equal(
        result.compilationJobsPerFile.size,
        1,
        "Should have one compilation job when force: true",
      );
      assert.equal(
        result.cacheHits.size,
        0,
        "Should have no cache hits when force: true",
      );
      assert(
        result.compilationJobsPerFile.has(npmRootPath),
        "npm file should be in compilationJobsPerFile when force: true",
      );
    });
  });
});

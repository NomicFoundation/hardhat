import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { FileBuildResultType } from "../../../../../../src/types/solidity/build-system.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

import { getHRE } from "./helpers.js";

describe("getCompilationJobs() cacheHits", () => {
  it("should return cacheHits map for unchanged local files", async () => {
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

    // Call getCompilationJobs
    const result = await hre.solidity.getCompilationJobs([filePath], {
      quiet: true,
    });

    assert(!("reason" in result), "getCompilationJobs should succeed");
    assert.equal(result.cacheHits.size, 1, "Should have one cache hit");
    assert.equal(
      result.compilationJobsPerFile.size,
      0,
      "Should have no compilation jobs",
    );
    assert(
      result.cacheHits.has(filePath),
      "Cache hit should be keyed by absolute path",
    );
  });

  it("should return correct CacheHitInfo structure", async () => {
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

    // First build to get original buildId
    const buildResult = await hre.solidity.build([filePath], { quiet: true });
    assert(!("reason" in buildResult), "Build should succeed");
    const fileBuildResult = buildResult.get(filePath);
    assert.equal(fileBuildResult?.type, FileBuildResultType.BUILD_SUCCESS);
    const originalBuildId = await fileBuildResult.compilationJob.getBuildId();

    // Call getCompilationJobs
    const result = await hre.solidity.getCompilationJobs([filePath], {
      quiet: true,
    });

    assert(!("reason" in result), "getCompilationJobs should succeed");
    const cacheHitInfo = result.cacheHits.get(filePath);

    assert(cacheHitInfo !== undefined, "Should have cache hit info");
    assert.equal(
      cacheHitInfo.buildId,
      originalBuildId,
      "buildId should match original",
    );
    assert(
      Array.isArray(cacheHitInfo.artifactPaths),
      "artifactPaths should be an array",
    );
    assert.equal(
      cacheHitInfo.artifactPaths.length,
      1,
      "Should have one artifact path",
    );
  });

  it("should put modified file in compilationJobsPerFile, unchanged in cacheHits", async () => {
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

    // Modify Foo.sol
    await writeFile(
      fooPath,
      `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Foo { uint256 public value; }`,
    );

    // Call getCompilationJobs
    const result = await hre.solidity.getCompilationJobs([fooPath, barPath], {
      quiet: true,
    });

    assert(!("reason" in result), "getCompilationJobs should succeed");
    assert(
      result.compilationJobsPerFile.has(fooPath),
      "Modified file should be in compilationJobsPerFile",
    );
    assert(
      result.cacheHits.has(barPath),
      "Unchanged file should be in cacheHits",
    );
    assert.equal(result.compilationJobsPerFile.size, 1);
    assert.equal(result.cacheHits.size, 1);
  });

  it("should return empty cacheHits with force: true", async () => {
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

    // Call getCompilationJobs with force: true
    const result = await hre.solidity.getCompilationJobs([filePath], {
      quiet: true,
      force: true,
    });

    assert(!("reason" in result), "getCompilationJobs should succeed");
    assert.equal(
      result.cacheHits.size,
      0,
      "Should have no cache hits with force: true",
    );
    assert.equal(
      result.compilationJobsPerFile.size,
      1,
      "Should have compilation job",
    );
  });

  it("should return empty cacheHits when all files need recompilation", async () => {
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

    // First getCompilationJobs call (no prior build)
    const result = await hre.solidity.getCompilationJobs([filePath], {
      quiet: true,
    });

    assert(!("reason" in result), "getCompilationJobs should succeed");
    assert.equal(
      result.cacheHits.size,
      0,
      "Should have no cache hits on fresh project",
    );
    assert.equal(
      result.compilationJobsPerFile.size,
      1,
      "Should have compilation job",
    );
  });

  it("should invalidate cache when dependency changes", async () => {
    await using project = await useTestProjectTemplate({
      name: "test-project",
      version: "1.0.0",
      files: {
        "contracts/Base.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Base {}`,
        "contracts/Child.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./Base.sol";
contract Child is Base {}`,
      },
    });

    const hre = await getHRE(project);
    const basePath = path.join(project.path, "contracts/Base.sol");
    const childPath = path.join(project.path, "contracts/Child.sol");

    // First build
    await hre.solidity.build([childPath], { quiet: true });

    // Modify Base.sol (dependency)
    await writeFile(
      basePath,
      `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract Base { uint256 public value; }`,
    );

    // Call getCompilationJobs for Child
    const result = await hre.solidity.getCompilationJobs([childPath], {
      quiet: true,
    });

    assert(!("reason" in result), "getCompilationJobs should succeed");
    assert.equal(
      result.cacheHits.size,
      0,
      "Should have no cache hits when dependency changed",
    );
    assert.equal(
      result.compilationJobsPerFile.size,
      1,
      "Should need recompilation",
    );
  });
});

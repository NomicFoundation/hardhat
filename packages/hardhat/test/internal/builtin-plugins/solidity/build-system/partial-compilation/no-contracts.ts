import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";
import { FileBuildResultType } from "../../../../../../src/types/solidity/build-system.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("root files without contracts", () => {
    it("should not recompile a file with only a pragma", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `pragma solidity ^0.8.0;`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile();
      const firstSnapshot = await project.getSnapshot();

      // There should be a build info and a type file, but no artifacts
      assertFileCounts(firstSnapshot, 1, 0, 1);
      assert.deepEqual(firstSnapshot.buildInfos[0].sources, ["A.sol"]);

      // Compile second time, without changes
      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      // Nothing should have been recompiled
      assert.deepEqual(secondSnapshot, firstSnapshot);
    });

    it("should not recompile a file with only a pragma when another file changes", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `pragma solidity ^0.8.0;`,
          "contracts/B.sol": `contract B {}`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile();
      const firstSnapshot = await project.getSnapshot();

      assertFileCounts(firstSnapshot, 1, 1, 2);

      const [buildInfo1] = firstSnapshot.buildInfos;

      // Build info should contain A.sol and B.sol
      assert.deepEqual(buildInfo1.sources, ["A.sol", "B.sol"]);

      // Modify B.sol
      await writeFile(
        path.join(_project.path, "contracts/B.sol"),
        `contract B { uint x; }`,
      );

      // Compile second time
      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      // Only B.sol should be recompiled, and A.sol keeps the first build info
      assertFileCounts(secondSnapshot, 2, 1, 2);
      assert.deepEqual(
        project.getBuildInfoForSourceFile(secondSnapshot, "B.sol").sources,
        ["B.sol"],
      );
      assert.deepEqual(
        secondSnapshot.buildInfos.find(
          (buildInfo) => buildInfo.buildId === buildInfo1.buildId,
        ),
        buildInfo1,
      );

      // Compile third time, without changes
      await project.compile();
      const thirdSnapshot = await project.getSnapshot();

      // Nothing should have been recompiled
      assert.deepEqual(thirdSnapshot, secondSnapshot);
    });

    it("should not recompile a file that only imports a contract in isolated mode", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `import "./B.sol";`,
          "contracts/B.sol": `contract B {}`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile({ defaultBuildProfile: "production" });
      const firstSnapshot = await project.getSnapshot();

      // There should be a build info per file, and only B has an artifact
      assertFileCounts(firstSnapshot, 2, 1, 2);

      // Compile second time, without changes
      await project.compile({ defaultBuildProfile: "production" });
      const secondSnapshot = await project.getSnapshot();

      // Nothing should have been recompiled
      assert.deepEqual(secondSnapshot, firstSnapshot);
    });

    it("should delete the build info when the file is removed", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `pragma solidity ^0.8.0;`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile();
      const firstSnapshot = await project.getSnapshot();

      assertFileCounts(firstSnapshot, 1, 0, 1);

      // Remove A.sol
      await rm(path.join(_project.path, "contracts/A.sol"));

      // Compile second time
      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      // There should be no files
      assertFileCounts(secondSnapshot, 0, 0, 0);
      assert.equal(secondSnapshot.buildInfoOutputs.length, 0);
    });

    it("should keep the build info when cleaning up artifacts with a new HRE", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `pragma solidity ^0.8.0;`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile();
      const firstSnapshot = await project.getSnapshot();

      assertFileCounts(firstSnapshot, 1, 0, 1);

      // Clean up with a new HRE, which hasn't built anything
      const newHre = await getHRE(_project);
      await newHre.solidity.cleanupArtifacts(
        await newHre.solidity.getRootFilePaths(),
        { scope: "contracts" },
      );

      // Nothing should have been deleted
      assert.deepEqual(await project.getSnapshot(), firstSnapshot);
    });

    it("should not recompile a file after its last contract is removed", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `pragma solidity ^0.8.0;
contract A {}
struct S { uint a; }
error Bad();
uint constant MAX = 1;`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile();
      const firstSnapshot = await project.getSnapshot();

      assertFileCounts(firstSnapshot, 1, 1, 1);

      // Remove the contract, keeping the file-level definitions
      await writeFile(
        path.join(_project.path, "contracts/A.sol"),
        `pragma solidity ^0.8.0;
struct S { uint a; }
error Bad();
uint constant MAX = 1;`,
      );

      // Compile second time
      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      // There should be a new build info and a type file, but no artifacts
      assertFileCounts(secondSnapshot, 1, 0, 1);
      assert.notEqual(
        secondSnapshot.buildInfos[0].buildId,
        firstSnapshot.buildInfos[0].buildId,
      );

      // Compile third time, without changes
      await project.compile();
      const thirdSnapshot = await project.getSnapshot();

      // Nothing should have been recompiled
      assert.deepEqual(thirdSnapshot, secondSnapshot);
    });

    it("should not recompile files without contracts that use different compilers", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `pragma solidity 0.8.30; struct S { uint a; }`,
          "contracts/B.sol": `pragma solidity 0.8.28; error Bad();`,
        },
      });
      const hre = await createHardhatRuntimeEnvironment(
        {
          solidity: {
            profiles: {
              default: {
                compilers: [{ version: "0.8.30" }, { version: "0.8.28" }],
              },
            },
          },
        },
        {},
        _project.path,
      );
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile();
      const firstSnapshot = await project.getSnapshot();

      // There should be a build info per compiler, and no artifacts
      assertFileCounts(firstSnapshot, 2, 0, 2);

      // Compile second time, without changes
      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      // Nothing should have been recompiled
      assert.deepEqual(secondSnapshot, firstSnapshot);
    });

    it("should not recompile an npm file without contracts in isolated mode", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/C.sol": `pragma solidity ^0.8.0; contract C {}`,
        },
        dependencies: {
          "@lib/x": {
            name: "@lib/x",
            version: "1.0.0",
            files: {
              "Types.sol": `pragma solidity ^0.8.0; struct S { uint a; }`,
            },
            exports: { "./*": "./*" },
          },
        },
      });
      const hre = await createHardhatRuntimeEnvironment(
        {
          solidity: {
            profiles: {
              default: { version: "0.8.30", isolated: false },
              production: { version: "0.8.30", isolated: true },
            },
            npmFilesToBuild: ["@lib/x/Types.sol"],
          },
        },
        {},
        _project.path,
      );
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile({ defaultBuildProfile: "production" });
      const firstSnapshot = await project.getSnapshot();

      // There should be a build info per file, and only C has an artifact
      assertFileCounts(firstSnapshot, 2, 1, 1);

      // Compile second time, without changes
      await project.compile({ defaultBuildProfile: "production" });
      const secondSnapshot = await project.getSnapshot();

      // Nothing should have been recompiled
      assert.deepEqual(secondSnapshot, firstSnapshot);
    });

    it("should not recompile a test file without contracts when tests are compiled separately", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/C.sol": `pragma solidity ^0.8.0; contract C {}`,
          "test/Helpers.sol": `pragma solidity ^0.8.0;
function two() pure returns (uint) { return 2; }`,
        },
      });
      const hre = await createHardhatRuntimeEnvironment(
        {
          solidity: {
            profiles: {
              default: { version: "0.8.30", isolated: false },
            },
            splitTestsCompilation: true,
          },
        },
        {},
        _project.path,
      );
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time, which also cleans up the tests build infos
      await project.compile();

      // Build the test file again
      const helpersPath = path.join(_project.path, "test/Helpers.sol");
      const result = await hre.solidity.build([helpersPath], {
        scope: "tests",
        quiet: true,
      });

      // It should be a cache hit
      assert(
        hre.solidity.isSuccessfulBuildResult(result),
        "Build should succeed",
      );
      assert.equal(
        result.get(helpersPath)?.type,
        FileBuildResultType.CACHE_HIT,
      );
    });
  });
});

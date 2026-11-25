import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";
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

      // cleanupArtifacts deletes the build info because no artifact points
      // to it. The type file remains, and that is enough for a cache hit.
      assertFileCounts(firstSnapshot, 0, 0, 1);
      assert.notEqual(firstSnapshot.typeFiles["A.sol"], undefined);

      // Compile second time, without changes
      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      // Nothing should have been recompiled
      assert.deepEqual(secondSnapshot, firstSnapshot);
    });

    it("should not throw HHE818 after a Mail struct field is added when a pragma-only file is also present", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `pragma solidity ^0.8.0;`,
          "contracts/B.sol": `pragma solidity ^0.8.0;

contract B {
  struct Mail {
    uint256 a;
  }
}
`,
          "test/B.t.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../contracts/B.sol";

contract BTest {
  function testDeploy() public {
    new B();
  }
}
`,
        },
      });

      const hre = await createHardhatRuntimeEnvironment(
        {
          solidity: {
            profiles: {
              default: { version: "0.8.30", isolated: false },
            },
          },
          test: {
            solidity: {
              eip712Types: {
                include: ["contracts/**"],
              },
            },
          },
        },
        {},
        _project.path,
      );

      const firstResult = await hre.tasks.getTask(["test", "solidity"]).run({});
      assert.equal(firstResult.success, true);

      await writeFile(
        path.join(_project.path, "contracts/B.sol"),
        `pragma solidity ^0.8.0;

contract B {
  struct Mail {
    uint256 a;
    uint256 b;
  }
}
`,
      );

      const secondResult = await hre.tasks
        .getTask(["test", "solidity"])
        .run({});
      assert.equal(secondResult.success, true);
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

      // A.sol emits no artifacts, so its build info is cleaned up. B keeps
      // one build info and one artifact. Both files still have type files.
      assertFileCounts(firstSnapshot, 1, 1, 2);

      // Compile second time, without changes
      await project.compile({ defaultBuildProfile: "production" });
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

      // Modify B.sol
      await writeFile(
        path.join(_project.path, "contracts/B.sol"),
        `contract B { uint x; }`,
      );

      // Compile second time
      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      // A.sol should not have been recompiled, and the old shared build info
      // should have been cleaned up.
      assert.deepEqual(
        secondSnapshot.typeFiles["A.sol"],
        firstSnapshot.typeFiles["A.sol"],
      );
      assertFileCounts(secondSnapshot, 1, 1, 2);

      // Compile third time, without changes
      await project.compile();
      const thirdSnapshot = await project.getSnapshot();

      // Nothing should have been recompiled
      assert.deepEqual(thirdSnapshot, secondSnapshot);
    });

    it("should regenerate the type file of a contract-less file when it is deleted", async () => {
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

      assertFileCounts(firstSnapshot, 0, 0, 1);

      await rm(firstSnapshot.typeFiles["A.sol"].path);

      // Compile second time
      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      assert.notEqual(secondSnapshot.typeFiles["A.sol"], undefined);
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

      assertFileCounts(firstSnapshot, 0, 0, 1);

      // Remove A.sol
      await rm(path.join(_project.path, "contracts/A.sol"));

      // Compile second time
      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      // There should be no files
      assertFileCounts(secondSnapshot, 0, 0, 0);
      assert.equal(secondSnapshot.buildInfoOutputs.length, 0);
    });
  });
});

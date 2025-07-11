/* eslint-disable @typescript-eslint/no-non-null-assertion -- test */
/* eslint-disable no-restricted-syntax -- test */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "../../../../../../src/hre.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

import { TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("changing solc config", () => {
    it("should recompile the files that are affected by the config change", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `pragma solidity ^0.7.0; contract A {} contract A2 {}`,
          "contracts/B.sol": `pragma solidity ^0.8.0; contract B {} contract B2 {}`,
          "contracts/C.sol": `pragma solidity ^0.8.0; contract C {} contract C2 {}`,
        },
      });
      const hre = await createHardhatRuntimeEnvironment(
        {
          solidity: {
            profiles: {
              default: {
                compilers: [{ version: "0.7.0" }, { version: "0.8.0" }],
              },
              "0_7_1": {
                compilers: [{ version: "0.7.1" }, { version: "0.8.0" }],
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

      // There should be 2 build infos, 2 artifacts per source file and 3 type files
      assert.equal(firstSnapshot.buildInfos.length, 2);
      assert.equal(firstSnapshot.buildInfoOutputs.length, 2);
      assert.equal(firstSnapshot.artifacts["A.sol"].length, 2);
      assert.equal(firstSnapshot.artifacts["B.sol"].length, 2);
      assert.equal(firstSnapshot.artifacts["C.sol"].length, 2);
      assert.notEqual(firstSnapshot.typeFiles["A.sol"], undefined);
      assert.notEqual(firstSnapshot.typeFiles["B.sol"], undefined);
      assert.notEqual(firstSnapshot.typeFiles["C.sol"], undefined);

      const aBuildInfo = project.getBuildInfoForSourceFile(
        firstSnapshot,
        "A.sol",
      );
      const bcBuildInfo = project.getBuildInfoForSourceFile(
        firstSnapshot,
        "B.sol",
      );

      // Artifacts from A should point to the first build info
      for (const artifact of firstSnapshot.artifacts["A.sol"]) {
        assert.equal(
          firstSnapshot.buildIdReferences[artifact.path],
          aBuildInfo.buildId,
        );
      }

      // Artifacts from B and C should point to the second build info
      for (const artifact of [
        ...firstSnapshot.artifacts["B.sol"],
        ...firstSnapshot.artifacts["C.sol"],
      ]) {
        assert.equal(
          firstSnapshot.buildIdReferences[artifact.path],
          bcBuildInfo.buildId,
        );
      }

      // Recompile using the profile that uses 0.7.1. Only A.sol should be affected, since it was compiled with 0.7.0
      hre.globalOptions.buildProfile = "0_7_1";
      await project.compile();

      const secondSnapshot = await project.getSnapshot();

      // There should be 2 build infos
      assert.equal(secondSnapshot.buildInfos.length, 2);

      // Old build info for A should be gone
      assert.ok(
        !secondSnapshot.buildInfos.some(
          (b) => b.buildId === aBuildInfo.buildId,
        ),
      );

      // Build info for B and C should be the same
      assert.ok(
        secondSnapshot.buildInfos.some(
          (b) => b.buildId === bcBuildInfo.buildId,
        ),
      );

      const newABuildInfo = secondSnapshot.buildInfos.find(
        (b) => b.buildId !== bcBuildInfo.buildId,
      )!;

      // Artifacts for B and C should be the same
      assert.deepEqual(
        secondSnapshot.artifacts["B.sol"],
        firstSnapshot.artifacts["B.sol"],
      );
      assert.deepEqual(
        secondSnapshot.artifacts["C.sol"],
        firstSnapshot.artifacts["C.sol"],
      );

      // There should be 2 new artifacts for A
      assert(secondSnapshot.artifacts["A.sol"].length === 2);
      assert.notDeepEqual(
        secondSnapshot.artifacts["A.sol"].map((a) => a.modificationTime),
        firstSnapshot.artifacts["A.sol"].map((a) => a.modificationTime),
      );

      // New artifacts should point to the new build info
      for (const artifact of secondSnapshot.artifacts["A.sol"]) {
        assert.equal(
          secondSnapshot.buildIdReferences[artifact.path],
          newABuildInfo.buildId,
        );
      }

      // Type files for B and C should be the same
      assert.deepEqual(
        secondSnapshot.typeFiles["B.sol"],
        firstSnapshot.typeFiles["B.sol"],
      );
      assert.deepEqual(
        secondSnapshot.typeFiles["C.sol"],
        firstSnapshot.typeFiles["C.sol"],
      );

      // Type file for A should not be the same
      assert.notDeepEqual(
        secondSnapshot.typeFiles["A.sol"],
        firstSnapshot.typeFiles["A.sol"],
      );
    });
  });
});

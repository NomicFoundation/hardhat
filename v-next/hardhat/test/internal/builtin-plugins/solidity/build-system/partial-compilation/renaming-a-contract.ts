import assert from "node:assert/strict";
import { rename } from "node:fs/promises";
import { basename } from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("renaming a contract", () => {
    it("deletes artifacts of the old name, recompiles and generates artifacts with the new name", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `contract A {} contract A2 {}`,
          "contracts/B.sol": `contract B {} contract B2 {}`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile();
      const firstSnapshot = await project.getSnapshot();

      // There should be 1 build info, 2 artifacts per source file and 2 type files
      assert.equal(firstSnapshot.buildInfos.length, 1);
      assert.equal(firstSnapshot.buildInfoOutputs.length, 1);
      assert.equal(firstSnapshot.artifacts["A.sol"].length, 2);
      assert.equal(firstSnapshot.artifacts["B.sol"].length, 2);
      assert.notEqual(firstSnapshot.typeFiles["A.sol"], undefined);
      assert.notEqual(firstSnapshot.typeFiles["B.sol"], undefined);

      // Rename A.sol to C.sol
      const aPath = _project.path + "/contracts/A.sol";
      await rename(aPath, aPath.replace("A.sol", "C.sol"));

      // Recompile
      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      // Artifacts for A.sol should be gone
      assert.equal(secondSnapshot.artifacts["A.sol"], undefined);
      assert.equal(Object.values(secondSnapshot.artifacts).flat().length, 4);

      // Artifacts for contracts A and A2 should be under C.sol now
      assert.deepEqual(
        secondSnapshot.artifacts["C.sol"].map((a) => basename(a.path)),
        ["A.json", "A2.json"],
      );

      // Artifacts for B shouldnt have changed
      assert.deepEqual(
        secondSnapshot.artifacts["B.sol"].map((a) => a.modificationTime),
        firstSnapshot.artifacts["B.sol"].map((a) => a.modificationTime),
      );

      // There should be 2 build infos, the second one containing only C.sol
      assert.equal(secondSnapshot.buildInfos.length, 2);
      assert.equal(secondSnapshot.buildInfoOutputs.length, 2);

      const buildInfos = secondSnapshot.buildInfos.sort(
        (a, b) => a.modificationTime - b.modificationTime,
      );

      // Artifacts from B should point to the first build info
      for (const artifact of secondSnapshot.artifacts["B.sol"]) {
        assert.equal(
          secondSnapshot.buildIdReferences[artifact.path],
          buildInfos[0].buildId,
        );
      }

      // Artifacts from C should point to the second build info
      for (const artifact of secondSnapshot.artifacts["C.sol"]) {
        assert.equal(
          secondSnapshot.buildIdReferences[artifact.path],
          buildInfos[1].buildId,
        );
      }
    });
  });
});

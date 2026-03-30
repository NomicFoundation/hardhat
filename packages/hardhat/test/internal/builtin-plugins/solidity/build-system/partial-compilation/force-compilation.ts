/* eslint-disable no-restricted-syntax -- test*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("Forcing compilation", () => {
    it("when using the --force flag, recompiles all files", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `contract A {}`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile();
      const firstSnapshot = await project.getSnapshot();

      assertFileCounts(firstSnapshot, 1, 1, 1);

      const [buildInfo1] = firstSnapshot.buildInfos;

      // The build info should contain A
      assert.deepEqual(buildInfo1.sources, ["A.sol"]);

      // Artifact should point to the single build info
      assert.equal(
        firstSnapshot.buildIdReferences[
          firstSnapshot.artifacts["A.sol"][0].path
        ],
        firstSnapshot.buildInfos[0].buildId,
      );

      // There should be 1 type definition file per source file
      assert.ok(firstSnapshot.typeFiles["A.sol"] !== undefined);

      // Recompile with --force
      await project.compile({ force: true });
      const secondSnapshot = await project.getSnapshot();

      assertFileCounts(secondSnapshot, 1, 1, 1);

      const [buildInfo2] = secondSnapshot.buildInfos;

      // Build info should be new
      assert.notDeepEqual(
        buildInfo1.modificationTime,
        buildInfo2.modificationTime,
      );
      assert.equal(buildInfo1.buildId, buildInfo2.buildId);

      // The build info should contain A
      assert.deepEqual(buildInfo2.sources, ["A.sol"]);

      // Artifact should point to the new build info
      assert.equal(
        secondSnapshot.buildIdReferences[
          secondSnapshot.artifacts["A.sol"][0].path
        ],
        buildInfo2.buildId,
      );

      // Artifact file should be new
      assert.notDeepEqual(
        firstSnapshot.artifacts["A.sol"][0].modificationTime,
        secondSnapshot.artifacts["A.sol"][0].modificationTime,
      );

      // Typefile should be new
      assert.notDeepEqual(
        firstSnapshot.typeFiles["A.sol"],
        secondSnapshot.typeFiles["A.sol"],
      );
    });
  });
});

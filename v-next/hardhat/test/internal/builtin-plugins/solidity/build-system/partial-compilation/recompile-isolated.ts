/* eslint-disable no-restricted-syntax -- test*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("Recompiling with changes in isolated mode", () => {
    it("it recompiles when changing from non-isolated to isolated", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `contract A {}`,
          "contracts/B.sol": `contract B {}`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile();
      const firstSnapshot = await project.getSnapshot();

      assertFileCounts(firstSnapshot, 1, 2, 2);

      const [buildInfo1] = firstSnapshot.buildInfos;

      // The build info should contain A and B
      assert.deepEqual(buildInfo1.sources, ["A.sol", "B.sol"]);

      // Artifacts should point to the build info
      assert.equal(
        firstSnapshot.buildIdReferences[
          firstSnapshot.artifacts["A.sol"][0].path
        ],
        firstSnapshot.buildInfos[0].buildId,
      );
      assert.equal(
        firstSnapshot.buildIdReferences[
          firstSnapshot.artifacts["B.sol"][0].path
        ],
        firstSnapshot.buildInfos[0].buildId,
      );

      // There should be 1 type definition file per source file
      assert.ok(firstSnapshot.typeFiles["A.sol"] !== undefined);
      assert.ok(firstSnapshot.typeFiles["B.sol"] !== undefined);

      // Recompile with --isolated
      await project.compile({ isolated: true });
      const secondSnapshot = await project.getSnapshot();

      assertFileCounts(secondSnapshot, 2, 2, 2);

      const buildInfoA = project.getBuildInfoForSourceFile(
        secondSnapshot,
        "A.sol",
      );
      const buildInfoB = project.getBuildInfoForSourceFile(
        secondSnapshot,
        "B.sol",
      );

      // Check both build infos are different from the first one
      assert.notEqual(buildInfoA.buildId, buildInfo1.buildId);
      assert.notEqual(buildInfoB.buildId, buildInfo1.buildId);

      // The build info should the respective sources
      assert.deepEqual(buildInfoA.sources, ["A.sol"]);
      assert.deepEqual(buildInfoB.sources, ["B.sol"]);

      // Artifact should point to the new build info
      assert.equal(
        secondSnapshot.buildIdReferences[
          secondSnapshot.artifacts["A.sol"][0].path
        ],
        buildInfoA.buildId,
      );

      assert.equal(
        secondSnapshot.buildIdReferences[
          secondSnapshot.artifacts["B.sol"][0].path
        ],
        buildInfoB.buildId,
      );

      // Artifact files should be new
      assert.notDeepEqual(
        firstSnapshot.artifacts["A.sol"][0].modificationTime,
        secondSnapshot.artifacts["A.sol"][0].modificationTime,
      );
      assert.notDeepEqual(
        firstSnapshot.artifacts["B.sol"][0].modificationTime,
        secondSnapshot.artifacts["B.sol"][0].modificationTime,
      );

      // Typefile should be new
      assert.notDeepEqual(
        firstSnapshot.typeFiles["A.sol"],
        secondSnapshot.typeFiles["A.sol"],
      );
      assert.notDeepEqual(
        firstSnapshot.typeFiles["B.sol"],
        secondSnapshot.typeFiles["B.sol"],
      );
    });

    it("it recompiles when changing from isolated to non-isolated", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `contract A {}`,
          "contracts/B.sol": `contract B {}`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile({ isolated: true });
      const firstSnapshot = await project.getSnapshot();

      assertFileCounts(firstSnapshot, 2, 2, 2);

      const buildInfoA = project.getBuildInfoForSourceFile(
        firstSnapshot,
        "A.sol",
      );
      const buildInfoB = project.getBuildInfoForSourceFile(
        firstSnapshot,
        "B.sol",
      );

      assert.deepEqual(buildInfoA.sources, ["A.sol"]);
      assert.deepEqual(buildInfoB.sources, ["B.sol"]);

      // Artifacts should point to the build info
      assert.equal(
        firstSnapshot.buildIdReferences[
          firstSnapshot.artifacts["A.sol"][0].path
        ],
        buildInfoA.buildId,
      );
      assert.equal(
        firstSnapshot.buildIdReferences[
          firstSnapshot.artifacts["B.sol"][0].path
        ],
        buildInfoB.buildId,
      );

      // There should be 1 type definition file per source file
      assert.ok(firstSnapshot.typeFiles["A.sol"] !== undefined);
      assert.ok(firstSnapshot.typeFiles["B.sol"] !== undefined);

      // Recompile with --isolated
      await project.compile({ isolated: false });
      const secondSnapshot = await project.getSnapshot();

      assertFileCounts(secondSnapshot, 1, 2, 2);

      const [newBuildInfo] = secondSnapshot.buildInfos;

      assert.notEqual(buildInfoA.buildId, newBuildInfo.buildId);
      assert.notEqual(buildInfoB.buildId, newBuildInfo.buildId);

      assert.deepEqual(newBuildInfo.sources, ["A.sol", "B.sol"]);

      // Artifact should point to the new build info
      assert.equal(
        secondSnapshot.buildIdReferences[
          secondSnapshot.artifacts["A.sol"][0].path
        ],
        newBuildInfo.buildId,
      );

      assert.equal(
        secondSnapshot.buildIdReferences[
          secondSnapshot.artifacts["B.sol"][0].path
        ],
        newBuildInfo.buildId,
      );

      // Artifact files should be new
      assert.notDeepEqual(
        firstSnapshot.artifacts["A.sol"][0].modificationTime,
        secondSnapshot.artifacts["A.sol"][0].modificationTime,
      );
      assert.notDeepEqual(
        firstSnapshot.artifacts["B.sol"][0].modificationTime,
        secondSnapshot.artifacts["B.sol"][0].modificationTime,
      );

      // Typefile should be new
      assert.notDeepEqual(
        firstSnapshot.typeFiles["A.sol"],
        secondSnapshot.typeFiles["A.sol"],
      );
      assert.notDeepEqual(
        firstSnapshot.typeFiles["B.sol"],
        secondSnapshot.typeFiles["B.sol"],
      );
    });
  });
});

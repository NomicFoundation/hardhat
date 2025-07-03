import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("Recompiling when an artifact has been manually deleted in between", () => {
    it("recompiles and regenerates artifacts", async () => {
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
      const { buildInfos, artifacts, buildIdReferences } = firstSnapshot;

      assert.equal(buildInfos.length, 1);

      assert.equal(artifacts["A.sol"].length, 2);
      assert.equal(artifacts["B.sol"].length, 2);

      // All artifacts should point to the single build info
      for (const artifact of [...artifacts["A.sol"], ...artifacts["B.sol"]]) {
        assert.equal(
          buildIdReferences[artifact.path],
          firstSnapshot.buildInfos[0].buildId,
        );
      }

      // Delete one of the artifacts manually
      await rm(artifacts["A.sol"][0].path);

      // Get the snapshot again, now there should be only 1 artifact for A
      const secondSnapshot = await project.getSnapshot();

      assert.equal(secondSnapshot.artifacts["A.sol"].length, 1);

      // Recompile
      await project.compile();

      // Take another snapshot. the 2 artifacts should be there again
      const thirdSnapshot = await project.getSnapshot();
      assert.equal(thirdSnapshot.artifacts["A.sol"].length, 2);

      // Timestamps for artifacts for A should be different because they were recompiled
      assert.notDeepEqual(
        firstSnapshot.artifacts["A.sol"].map((a) => a.modificationTime),
        thirdSnapshot.artifacts["A.sol"].map((a) => a.modificationTime),
      );

      // Build info for the new artifacts should be different since they were recompiled
      assert.notEqual(
        firstSnapshot.buildIdReferences[artifacts["A.sol"][0].path],
        thirdSnapshot.buildIdReferences[artifacts["A.sol"][0].path],
      );

      // Timestamps for artifacts for B should be the same because they weren't recompiled
      assert.deepEqual(
        firstSnapshot.artifacts["B.sol"].map((a) => a.modificationTime),
        thirdSnapshot.artifacts["B.sol"].map((a) => a.modificationTime),
      );

      // Build info for B's artifacts should be the same because they weren't recompiled
      assert.equal(
        firstSnapshot.buildIdReferences[artifacts["B.sol"][0].path],
        thirdSnapshot.buildIdReferences[artifacts["B.sol"][0].path],
      );
    });
  });

  describe("Recompiling when a build info file has been manually deleted in between", () => {
    it("recompiles and regenerates the build info", async () => {
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
      const { buildInfos, artifacts, buildIdReferences } = firstSnapshot;

      assert.equal(buildInfos.length, 1);
      const [firstBuildInfo] = buildInfos;

      assert.equal(artifacts["A.sol"].length, 2);
      assert.equal(artifacts["B.sol"].length, 2);

      // All artifacts should point to the single build info
      for (const artifact of artifacts["A.sol"]) {
        assert.equal(buildIdReferences[artifact.path], firstBuildInfo.buildId);
      }
      for (const artifact of artifacts["B.sol"]) {
        assert.equal(buildIdReferences[artifact.path], firstBuildInfo.buildId);
      }

      // Delete the build info file
      await rm(firstBuildInfo.path);

      // Get the snapshot again, the build info shouldnt be there anymore
      const secondSnapshot = await project.getSnapshot();

      assert.equal(secondSnapshot.buildInfos.length, 0);

      // Recompile
      await project.compile();

      // Take another snapshot. the build info file should be there with the same id as the first one
      const thirdSnapshot = await project.getSnapshot();

      assert.equal(thirdSnapshot.buildInfos.length, 1);

      const [newBuildInfo] = thirdSnapshot.buildInfos;

      assert.equal(newBuildInfo.path, firstBuildInfo.path);
      assert.equal(newBuildInfo.buildId, firstBuildInfo.buildId);

      assert.equal(thirdSnapshot.artifacts["A.sol"].length, 2);
      assert.equal(thirdSnapshot.artifacts["B.sol"].length, 2);

      // Timestamps for all artifacts should be different because they were recompiled
      assert.notDeepEqual(
        Object.values(firstSnapshot.artifacts)
          .flat()
          .map((a) => a.modificationTime),
        Object.values(thirdSnapshot.artifacts)
          .flat()
          .map((a) => a.modificationTime),
      );

      // All artifacts should point to the new build info
      for (const artifact of Object.values(thirdSnapshot.artifacts).flat()) {
        assert.equal(buildIdReferences[artifact.path], newBuildInfo.buildId);
      }
    });
  });

  describe("Recompiling when a typefile has been manually deleted in between", () => {
    it("recompiles and regenerates the typefile", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `contract A {} contract A2 {}`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile();

      const firstSnapshot = await project.getSnapshot();

      // Typefile should be there
      assert.notEqual(firstSnapshot.typeFiles["A.sol"], undefined);

      // Delete the typefile
      await rm(firstSnapshot.typeFiles["A.sol"].path);

      // Get the snapshot again, the typefile shouldnt be there anymore
      const secondSnapshot = await project.getSnapshot();

      assert.equal(secondSnapshot.typeFiles["A.sol"], undefined);

      // Recompile
      await project.compile();

      // Take another snapshot. the typefile should be there
      const thirdSnapshot = await project.getSnapshot();

      assert.notEqual(thirdSnapshot.typeFiles["A.sol"], undefined);
    });
  });

  describe("Recompiling when build info output has been manually deleted in between", () => {
    it("recompiles and regenerates the typefile", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `contract A {} contract A2 {}`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile();

      const firstSnapshot = await project.getSnapshot();

      // build info output should be there
      assert.equal(firstSnapshot.buildInfoOutputs.length, 1);

      // Delete the build info output
      await rm(firstSnapshot.buildInfoOutputs[0].path);

      // Get the snapshot again, the build info output shouldnt be there anymore
      const secondSnapshot = await project.getSnapshot();

      assert.equal(secondSnapshot.buildInfoOutputs.length, 0);

      // Recompile
      await project.compile();

      // Take another snapshot. the build info output should be there
      const thirdSnapshot = await project.getSnapshot();

      assert.equal(thirdSnapshot.buildInfoOutputs.length, 1);
    });
  });
});

/* eslint-disable @typescript-eslint/no-non-null-assertion -- test*/
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { getHRE, TestProjectWrapper } from "./helpers.js";

// This test scenario involves compiling a file, then changing it and recompiling. Then
// changing it again to the previous content and recompiling. the artifacts/build info should be
// the first version, not the second one. It's used to ensure the cache is not flaky
// It's important that there's a second unchanged file so the first build info is not deleted
describe("Partial compilation", () => {
  describe("changing a file and rolling it back", () => {
    it("should output the correct build info and artifacts", async () => {
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

      const [buildInfo1] = firstSnapshot.buildInfos;
      const [artifactA1] = firstSnapshot.artifacts["A.sol"];
      const [artifactB1] = firstSnapshot.artifacts["B.sol"];

      // Artifacts should point to build info
      assert.equal(
        firstSnapshot.buildIdReferences[artifactA1.path],
        buildInfo1.buildId,
      );
      assert.equal(
        firstSnapshot.buildIdReferences[artifactB1.path],
        buildInfo1.buildId,
      );

      // Change A.sol
      await writeFile(
        path.join(_project.path, "contracts/A.sol"),
        "contract A {uint foo;}",
      );

      // Compile second time
      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      // There should be 2 build infos
      assert.equal(secondSnapshot.buildInfos.length, 2);

      // Get a reference to the second build info
      const buildInfo2 = secondSnapshot.buildInfos.find(
        (bi) => bi.buildId !== buildInfo1.buildId,
      )!;

      const [artifactA2] = secondSnapshot.artifacts["A.sol"];
      const [artifactB2] = secondSnapshot.artifacts["B.sol"];

      // A artifact should point to the new build info, B still to the old
      assert.equal(
        secondSnapshot.buildIdReferences[artifactA2.path],
        buildInfo2.buildId,
      );
      assert.equal(
        secondSnapshot.buildIdReferences[artifactB2.path],
        buildInfo1.buildId,
      );

      // Change the file back to the original content
      await writeFile(
        path.join(_project.path, "contracts/A.sol"),
        "contract A {}",
      );

      // Compile a third time
      await project.compile();
      const thirdSnapshot = await project.getSnapshot();

      // There should be 2 build infos, the first one which B points to, and a new one that includes only A, but different from the second one
      assert.equal(thirdSnapshot.buildInfos.length, 2);
      const buildInfo3 = thirdSnapshot.buildInfos.find(
        (bi) => ![buildInfo1.buildId, buildInfo2.buildId].includes(bi.buildId),
      )!;

      const [artifactA3] = thirdSnapshot.artifacts["A.sol"];
      const [artifactB3] = thirdSnapshot.artifacts["B.sol"];

      // B should still point to the first build info, but A should point to the new one
      assert.equal(
        thirdSnapshot.buildIdReferences[artifactA3.path],
        buildInfo3.buildId,
      );
      assert.equal(
        thirdSnapshot.buildIdReferences[artifactB3.path],
        buildInfo1.buildId,
      );
    });
  });
});

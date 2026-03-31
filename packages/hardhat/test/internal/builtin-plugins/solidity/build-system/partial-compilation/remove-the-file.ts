import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("delete the only file in a project", () => {
    it("should delete build info, artifacts and typefile", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/Foo.sol": `contract Foo {}`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      // Compile first time
      await project.compile();
      const firstSnapshot = await project.getSnapshot();

      assertFileCounts(firstSnapshot, 1, 1, 1);

      const [buildInfo1] = firstSnapshot.buildInfos;

      // Build info should contain Foo.sol
      assert.deepEqual(buildInfo1.sources, ["Foo.sol"]);

      // Artifact should point to build info
      assert.equal(
        firstSnapshot.buildIdReferences[
          firstSnapshot.artifacts["Foo.sol"][0].path
        ],
        buildInfo1.buildId,
      );

      // There should be the type file
      assert.notEqual(firstSnapshot.typeFiles["Foo.sol"], undefined);

      // Remove Foo.sol
      await rm(path.join(_project.path, "contracts/Foo.sol"));

      // Compile second time
      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      // There should be no files
      assertFileCounts(secondSnapshot, 0, 0, 0);
    });
  });
});

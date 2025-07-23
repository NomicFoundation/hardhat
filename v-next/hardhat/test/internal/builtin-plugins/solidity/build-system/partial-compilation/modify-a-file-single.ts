import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("modify a file in a one-file project", () => {
    it("should delete old build info, create a new one, update artifacts and typefile", async () => {
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

      // There should be 1 build info
      assert.equal(firstSnapshot.buildInfos.length, 1);

      const [buildInfo1] = firstSnapshot.buildInfos;

      // Build info should contain Foo.sol
      assert.deepEqual(buildInfo1.sources, ["Foo.sol"]);

      // There should be 1 artifact
      assert.equal(firstSnapshot.artifacts["Foo.sol"].length, 1);

      // Artifact should point to build info
      assert.equal(
        firstSnapshot.buildIdReferences[
          firstSnapshot.artifacts["Foo.sol"][0].path
        ],
        buildInfo1.buildId,
      );

      // There should be the type file
      assert.notEqual(firstSnapshot.typeFiles["Foo.sol"], undefined);

      // Change A.sol
      await writeFile(
        path.join(_project.path, "contracts/Foo.sol"),
        "contract Foo { }",
      );

      // Compile second time
      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      // There should be 1 build info
      assert.equal(secondSnapshot.buildInfos.length, 1);

      // Get a reference to the second build info
      const [buildInfo2] = secondSnapshot.buildInfos;

      // The second build info should be different from the first
      assert.notEqual(buildInfo2.buildId, buildInfo1.buildId);

      // Build info should contain Foo.sol
      assert.deepEqual(buildInfo2.sources, ["Foo.sol"]);

      // There should be 1 artifact
      assert.equal(secondSnapshot.artifacts["Foo.sol"].length, 1);

      // New artifact should point to the new build info
      assert.equal(
        secondSnapshot.buildIdReferences[
          secondSnapshot.artifacts["Foo.sol"][0].path
        ],
        buildInfo2.buildId,
      );

      // There should be a new type file
      assert.notDeepEqual(
        secondSnapshot.typeFiles["Foo.sol"],
        firstSnapshot.typeFiles["Foo.sol"],
      );
    });
  });
});

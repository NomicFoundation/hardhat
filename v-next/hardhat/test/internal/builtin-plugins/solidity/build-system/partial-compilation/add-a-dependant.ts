import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("add a dependant", () => {
    describe("non-isolated mode", function () {
      it("should handle build infos and artifacts appropiately", async () => {
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

        // Create a new file that depends on Foo
        await writeFile(
          path.join(_project.path, "contracts/FooFactory.sol"),
          "import './Foo.sol';contract FooFactory {Foo foo;}",
        );

        // Compile second time
        await project.compile();
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 2, 2, 2);

        // Get references to Foo and FooFactory build infos
        const buildInfoFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Foo.sol",
        );
        const buildInfoFooFactory = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "FooFactory.sol",
        );

        // Foo build info should be the same as the first one
        assert.deepEqual(buildInfoFoo, firstSnapshot.buildInfos[0]);

        // Build infos should contain the respective sources
        assert.deepEqual(buildInfoFoo.sources, ["Foo.sol"]);
        assert.deepEqual(buildInfoFooFactory.sources, [
          "Foo.sol",
          "FooFactory.sol",
        ]);

        // Artifact from Foo should be the same as the first one
        assert.deepEqual(
          secondSnapshot.artifacts["Foo.sol"],
          firstSnapshot.artifacts["Foo.sol"],
        );

        // Artifact from Foo should point to the Foo build info
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["Foo.sol"][0].path
          ],
          buildInfoFoo.buildId,
        );

        // Artifact from FooFactory should point to the FooFactory build info
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["FooFactory.sol"][0].path
          ],
          buildInfoFooFactory.buildId,
        );

        // Typefile for Foo should be the same as before
        assert.deepEqual(
          firstSnapshot.typeFiles["Foo.sol"],
          secondSnapshot.typeFiles["Foo.sol"],
        );

        // There should be a typefile for FooFactory
        assert.notEqual(secondSnapshot.typeFiles["FooFactory.sol"], undefined);
      });
    });

    describe("isolated mode", function () {
      it("should handle build infos and artifacts appropiately", async () => {
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
        await project.compile({ isolated: true });
        const firstSnapshot = await project.getSnapshot();

        assertFileCounts(firstSnapshot, 1, 1, 1);

        // Create a new file that depends on Foo
        await writeFile(
          path.join(_project.path, "contracts/FooFactory.sol"),
          "import './Foo.sol';contract FooFactory {Foo foo;}",
        );

        // Compile second time
        await project.compile({ isolated: true });
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 2, 2, 2);

        // Get references to Foo and FooFactory build infos
        const buildInfoFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Foo.sol",
        );
        const buildInfoFooFactory = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "FooFactory.sol",
        );

        // Foo build info should be the same as the first one
        assert.deepEqual(buildInfoFoo, firstSnapshot.buildInfos[0]);

        // Build infos should contain the respective sources
        assert.deepEqual(buildInfoFoo.sources, ["Foo.sol"]);
        assert.deepEqual(buildInfoFooFactory.sources, [
          "Foo.sol",
          "FooFactory.sol",
        ]);

        // Artifact from Foo should be the same as the first one
        assert.deepEqual(
          secondSnapshot.artifacts["Foo.sol"],
          firstSnapshot.artifacts["Foo.sol"],
        );

        // Artifact from Foo should point to the Foo build info
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["Foo.sol"][0].path
          ],
          buildInfoFoo.buildId,
        );

        // Artifact from FooFactory should point to the FooFactory build info
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["FooFactory.sol"][0].path
          ],
          buildInfoFooFactory.buildId,
        );

        // Typefile for Foo should be the same as before
        assert.deepEqual(
          firstSnapshot.typeFiles["Foo.sol"],
          secondSnapshot.typeFiles["Foo.sol"],
        );

        // There should be a typefile for FooFactory
        assert.notEqual(secondSnapshot.typeFiles["FooFactory.sol"], undefined);
      });
    });
  });
});

/* eslint-disable @typescript-eslint/no-non-null-assertion  -- test */
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("modify bottom dependant on A->B->C schema", () => {
    describe("non-isolated mode", function () {
      it("should handle build infos and artifacts appropiately", async () => {
        await using _project = await useTestProjectTemplate({
          name: "test",
          version: "1.0.0",
          files: {
            "contracts/Foo.sol": `import './IFoo.sol';contract Foo is IFoo {}`,
            "contracts/IFoo.sol": `interface IFoo {}`,
            "contracts/FooFactory.sol": `import './Foo.sol';contract FooFactory {Foo foo;}`,
          },
        });
        const hre = await getHRE(_project);
        const project = new TestProjectWrapper(_project, hre);

        // Compile first time
        await project.compile();
        const firstSnapshot = await project.getSnapshot();

        assertFileCounts(firstSnapshot, 1, 3, 3);

        // Get a reference to the second first info
        const [buildInfo1] = firstSnapshot.buildInfos;

        // Change FooFactory.sol
        await writeFile(
          path.join(_project.path, "contracts/FooFactory.sol"),
          `import './Foo.sol';contract FooFactory {Foo foo; }`,
        );

        // Compile second time
        await project.compile();
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 2, 3, 3);

        // Get a reference to the second build info. first one still exists
        const buildInfo2 = secondSnapshot.buildInfos.find(
          (bi) => bi.buildId !== buildInfo1.buildId,
        )!;

        // New build info contains all sources
        assert.deepEqual(buildInfo2.sources, [
          "Foo.sol",
          "FooFactory.sol",
          "IFoo.sol",
        ]);

        // Foo and IFoo artifacts should be the same as the first one
        assert.deepEqual(
          secondSnapshot.artifacts["IFoo.sol"],
          firstSnapshot.artifacts["IFoo.sol"],
        );
        assert.deepEqual(
          secondSnapshot.artifacts["Foo.sol"],
          firstSnapshot.artifacts["Foo.sol"],
        );

        // FooFactory artifact should be different
        assert.notDeepEqual(
          secondSnapshot.artifacts["FooFactory.sol"],
          firstSnapshot.artifacts["FooFactory.sol"],
        );

        // FooFactory's artifact should point to the new build info
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["FooFactory.sol"][0].path
          ],
          buildInfo2.buildId,
        );

        // Typefile for IFoo and Foo should be the same as the first one
        assert.deepEqual(
          firstSnapshot.typeFiles["IFoo.sol"],
          secondSnapshot.typeFiles["IFoo.sol"],
        );
        assert.deepEqual(
          firstSnapshot.typeFiles["Foo.sol"],
          secondSnapshot.typeFiles["Foo.sol"],
        );

        // Typefile for FooFactory should be different
        assert.notDeepEqual(
          firstSnapshot.typeFiles["FooFactory.sol"],
          secondSnapshot.typeFiles["FooFactory.sol"],
        );
      });
    });
    describe("isolated mode", function () {
      it("should handle build infos and artifacts appropiately", async () => {
        await using _project = await useTestProjectTemplate({
          name: "test",
          version: "1.0.0",
          files: {
            "contracts/Foo.sol": `import './IFoo.sol';contract Foo is IFoo {}`,
            "contracts/IFoo.sol": `interface IFoo {}`,
            "contracts/FooFactory.sol": `import './Foo.sol';contract FooFactory {Foo foo;}`,
          },
        });
        const hre = await getHRE(_project);
        const project = new TestProjectWrapper(_project, hre);

        // Compile first time
        await project.compile({ isolated: true });
        const firstSnapshot = await project.getSnapshot();

        assertFileCounts(firstSnapshot, 3, 3, 3);

        // Get a reference to each build info
        const buildInfoFoo = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "Foo.sol",
        );
        const buildInfoFooFactory = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "FooFactory.sol",
        );
        const buildInfoIFoo = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "IFoo.sol",
        );

        // Change FooFactory.sol
        await writeFile(
          path.join(_project.path, "contracts/FooFactory.sol"),
          `import './Foo.sol';contract FooFactory {Foo foo; }`,
        );

        // Compile second time
        await project.compile({ isolated: true });
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 3, 3, 3);

        // Get a reference to each build info
        const newBuildInfoFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Foo.sol",
        );
        const newBuildInfoFooFactory = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "FooFactory.sol",
        );
        const newBuildInfoIFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "IFoo.sol",
        );

        // IFoo and Foo build infos should be the same
        assert.deepEqual(buildInfoIFoo, newBuildInfoIFoo);
        assert.deepEqual(buildInfoFoo, newBuildInfoFoo);

        // FooFactory's build info should be different
        assert.notDeepEqual(buildInfoFooFactory, newBuildInfoFooFactory);

        // Each build info should contain the respective sources
        assert.deepEqual(newBuildInfoFooFactory.sources, [
          "Foo.sol",
          "FooFactory.sol",
          "IFoo.sol",
        ]);
        assert.deepEqual(newBuildInfoFoo.sources, ["Foo.sol", "IFoo.sol"]);
        assert.deepEqual(newBuildInfoIFoo.sources, ["IFoo.sol"]);

        // Artifact for IFoo and Foo should be the same
        assert.deepEqual(
          secondSnapshot.artifacts["IFoo.sol"][0],
          firstSnapshot.artifacts["IFoo.sol"][0],
        );
        assert.deepEqual(
          secondSnapshot.artifacts["Foo.sol"][0],
          firstSnapshot.artifacts["Foo.sol"][0],
        );

        // Artifact from FooFactory should be different than the first run
        assert.notDeepEqual(
          secondSnapshot.artifacts["FooFactory.sol"][0],
          firstSnapshot.artifacts["FooFactory.sol"][0],
        );

        // Artifact for FooFactory should point to the new build info
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["FooFactory.sol"][0].path
          ],
          newBuildInfoFooFactory.buildId,
        );

        // Typefile for IFoo and Foo should be the same
        assert.deepEqual(
          secondSnapshot.typeFiles["IFoo.sol"],
          firstSnapshot.typeFiles["IFoo.sol"],
        );
        assert.deepEqual(
          secondSnapshot.typeFiles["Foo.sol"],
          firstSnapshot.typeFiles["Foo.sol"],
        );

        // Typefile for FooFactory should be new
        assert.notDeepEqual(
          secondSnapshot.typeFiles[`FooFactory.sol`],
          firstSnapshot.typeFiles[`FooFactory.sol`],
        );
      });
    });
  });
});

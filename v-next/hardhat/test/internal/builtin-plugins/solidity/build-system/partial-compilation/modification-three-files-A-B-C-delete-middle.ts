/* eslint-disable @typescript-eslint/no-non-null-assertion  -- test */
import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("delete middle dependency on A->B->C schema", () => {
    describe("non-isolated mode", function () {
      it("should handle build infos and artifacts appropriately", async () => {
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

        // delete Foo.sol
        await rm(path.join(_project.path, "contracts/Foo.sol"));

        // update FooFactory.sol
        await writeFile(
          path.join(_project.path, "contracts/FooFactory.sol"),
          `import './IFoo.sol';contract FooFactory is IFoo {}`,
        );

        // Compile second time
        await project.compile();
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 2, 2, 2);

        // Get a reference to the second build info
        const buildInfo2 = secondSnapshot.buildInfos.find(
          (bi) => bi.buildId !== buildInfo1.buildId,
        )!;

        // The second build info should be different from the first
        assert.notEqual(buildInfo2.buildId, buildInfo1.buildId);

        // Build info should contain IFoo and FooFactory
        assert.deepEqual(buildInfo2.sources, ["FooFactory.sol", "IFoo.sol"]);

        // IFoo artifact should be the same as the first one
        assert.deepEqual(
          secondSnapshot.artifacts["IFoo.sol"][0],
          firstSnapshot.artifacts["IFoo.sol"][0],
        );

        // FooFactory artifact should be different from first run
        assert.notDeepEqual(
          secondSnapshot.artifacts["FooFactory.sol"][0],
          firstSnapshot.artifacts["FooFactory.sol"][0],
        );

        // FooFactory's artifact should point to the new build info
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["FooFactory.sol"][0].path
          ],
          buildInfo2.buildId,
        );

        // IFoo typefile should be the same as the first one
        assert.deepEqual(
          secondSnapshot.typeFiles["IFoo.sol"],
          firstSnapshot.typeFiles["IFoo.sol"],
        );

        // FooFactory typefile should be new
        assert.notDeepEqual(
          secondSnapshot.typeFiles["FooFactory.sol"],
          firstSnapshot.typeFiles["FooFactory.sol"],
        );
      });
    });

    describe("isolated mode", function () {
      it("should handle build infos and artifacts appropriately", async () => {
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
        await project.compile({ defaultBuildProfile: "production" });
        const firstSnapshot = await project.getSnapshot();

        assertFileCounts(firstSnapshot, 3, 3, 3);

        // Get a reference to build infos
        const buildInfoIFoo = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "IFoo.sol",
        );
        const buildInfoFooFactory = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "FooFactory.sol",
        );

        // delete Foo.sol
        await rm(path.join(_project.path, "contracts/Foo.sol"));

        // update FooFactory.sol
        await writeFile(
          path.join(_project.path, "contracts/FooFactory.sol"),
          `import './IFoo.sol';contract FooFactory is IFoo {}`,
        );

        // Compile second time
        await project.compile({ defaultBuildProfile: "production" });
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 2, 2, 2);

        // Get new references to each build info
        const newBuildInfoIFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "IFoo.sol",
        );
        const newBuildInfoFooFactory = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "FooFactory.sol",
        );

        // IFoo build info should be the same
        assert.deepEqual(buildInfoIFoo, newBuildInfoIFoo);

        // FooFactory build info should be different
        assert.notDeepEqual(buildInfoFooFactory, newBuildInfoFooFactory);

        // IFoo build info should contain only IFoo
        assert.deepEqual(newBuildInfoIFoo.sources, ["IFoo.sol"]);

        // FooFactory build info should contain IFoo and FooFactory
        assert.deepEqual(newBuildInfoFooFactory.sources, [
          "FooFactory.sol",
          "IFoo.sol",
        ]);

        // IFoo artifact should be the same as the first one
        assert.deepEqual(
          secondSnapshot.artifacts[`IFoo.sol`][0],
          firstSnapshot.artifacts[`IFoo.sol`][0],
        );

        // FooFactory artifact should be different from first run
        assert.notDeepEqual(
          secondSnapshot.artifacts[`FooFactory.sol`][0],
          firstSnapshot.artifacts[`FooFactory.sol`][0],
        );

        // Foofactory's artifact should point to the new build info
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["FooFactory.sol"][0].path
          ],
          newBuildInfoFooFactory.buildId,
        );

        // IFoo typefile should be the same as the first one
        assert.deepEqual(
          secondSnapshot.typeFiles[`IFoo.sol`],
          firstSnapshot.typeFiles[`IFoo.sol`],
        );

        // FooFactory typefile should be new
        assert.notDeepEqual(
          secondSnapshot.typeFiles[`FooFactory.sol`],
          firstSnapshot.typeFiles[`FooFactory.sol`],
        );
      });
    });
  });
});

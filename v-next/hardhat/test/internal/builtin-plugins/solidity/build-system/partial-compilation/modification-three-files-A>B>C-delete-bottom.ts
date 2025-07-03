import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("delete bottom dependant on A->B->C schema", () => {
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

        // Delete FooFactory.sol
        await rm(path.join(_project.path, "contracts/FooFactory.sol"));

        // Compile second time
        await project.compile();
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 1, 2, 2);

        // Get a reference to the second build info
        const [buildInfo2] = secondSnapshot.buildInfos;

        // The second build info should be the same
        assert.deepEqual(buildInfo2, buildInfo1);

        // Build info should contain IFoo and FooFactory
        assert.deepEqual(buildInfo2.sources, [
          "Foo.sol",
          "FooFactory.sol",
          "IFoo.sol",
        ]);

        // IFoo and Foo artifacts should be the same as the first one
        assert.deepEqual(
          secondSnapshot.artifacts["IFoo.sol"][0],
          firstSnapshot.artifacts["IFoo.sol"][0],
        );
        assert.deepEqual(
          secondSnapshot.artifacts["Foo.sol"][0],
          firstSnapshot.artifacts["Foo.sol"][0],
        );

        // IFoo and Foo typefiles should be the same as the first one
        assert.deepEqual(
          secondSnapshot.typeFiles["IFoo.sol"],
          firstSnapshot.typeFiles["IFoo.sol"],
        );

        assert.deepEqual(
          secondSnapshot.typeFiles["Foo.sol"],
          firstSnapshot.typeFiles["Foo.sol"],
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

        // Get a reference to build infos
        const buildInfoIFoo = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "IFoo.sol",
        );
        const buildInfoFoo = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "Foo.sol",
        );

        // delete FooFactory.sol
        await rm(path.join(_project.path, "contracts/FooFactory.sol"));

        // Compile second time
        await project.compile({ isolated: true });
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 2, 2, 2);

        // Get new references to each build info
        const newBuildInfoIFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "IFoo.sol",
        );
        const newBuildInfoFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Foo.sol",
        );

        // IFoo and Foo Build infos should be the same
        assert.deepEqual(buildInfoIFoo, newBuildInfoIFoo);
        assert.deepEqual(buildInfoFoo, newBuildInfoFoo);

        // IFoo build info should contain only IFoo
        assert.deepEqual(newBuildInfoIFoo.sources, ["IFoo.sol"]);

        // Foo build info should contain Foo and IFoo
        assert.deepEqual(newBuildInfoFoo.sources, ["Foo.sol", "IFoo.sol"]);

        // IFoo and Foo artifacts should be the same as the first one
        assert.deepEqual(
          secondSnapshot.artifacts[`IFoo.sol`][0],
          firstSnapshot.artifacts[`IFoo.sol`][0],
        );
        assert.deepEqual(
          secondSnapshot.artifacts[`Foo.sol`][0],
          firstSnapshot.artifacts[`Foo.sol`][0],
        );

        // IFoo and Foo typefiles should be the same as the first one
        assert.deepEqual(
          secondSnapshot.typeFiles[`IFoo.sol`],
          firstSnapshot.typeFiles[`IFoo.sol`],
        );
        assert.deepEqual(
          secondSnapshot.typeFiles[`Foo.sol`],
          firstSnapshot.typeFiles[`Foo.sol`],
        );
      });
    });
  });
});

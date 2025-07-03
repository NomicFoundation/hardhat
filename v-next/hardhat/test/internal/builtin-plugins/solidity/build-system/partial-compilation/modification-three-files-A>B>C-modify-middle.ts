/* eslint-disable @typescript-eslint/no-non-null-assertion  -- test */
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("modify middle dependency on A->B->C schema", () => {
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

        // Change Foo.sol
        await writeFile(
          path.join(_project.path, "contracts/Foo.sol"),
          "import './IFoo.sol';contract Foo is IFoo { }",
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

        // IFoo artifact should be the same as the first one
        assert.deepEqual(
          secondSnapshot.artifacts["IFoo.sol"],
          firstSnapshot.artifacts["IFoo.sol"],
        );

        // Foo and FooFactory's artifacts should be different
        assert.notDeepEqual(
          secondSnapshot.artifacts["Foo.sol"],
          firstSnapshot.artifacts["Foo.sol"],
        );
        assert.notDeepEqual(
          secondSnapshot.artifacts["FooFactory.sol"],
          firstSnapshot.artifacts["FooFactory.sol"],
        );

        // Foo and FooFactory's artifacts should point to the new build info
        for (const source of ["Foo.sol", "FooFactory.sol"]) {
          assert.equal(
            secondSnapshot.buildIdReferences[
              secondSnapshot.artifacts[source][0].path
            ],
            buildInfo2.buildId,
          );
        }

        // Typefile for IFoo should be the same as the first one
        assert.deepEqual(
          firstSnapshot.typeFiles["IFoo.sol"],
          secondSnapshot.typeFiles["IFoo.sol"],
        );

        // Typefile for Foo and FooFactory should be different
        assert.notDeepEqual(
          firstSnapshot.typeFiles["Foo.sol"],
          secondSnapshot.typeFiles["Foo.sol"],
        );
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

        // Change Foo.sol
        await writeFile(
          path.join(_project.path, "contracts/Foo.sol"),
          "import './IFoo.sol';contract Foo is IFoo { }",
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

        // IFoo build info should be the same
        assert.deepEqual(buildInfoIFoo, newBuildInfoIFoo);

        // Foo and FooFactory's build infos should be different
        assert.notDeepEqual(buildInfoFoo, newBuildInfoFoo);
        assert.notDeepEqual(buildInfoFooFactory, newBuildInfoFooFactory);

        // Each build info should contain the respective sources
        assert.deepEqual(newBuildInfoFooFactory.sources, [
          "Foo.sol",
          "FooFactory.sol",
          "IFoo.sol",
        ]);
        assert.deepEqual(newBuildInfoFoo.sources, ["Foo.sol", "IFoo.sol"]);
        assert.deepEqual(newBuildInfoIFoo.sources, ["IFoo.sol"]);

        // Artifact for IFoo should be the same
        assert.deepEqual(
          secondSnapshot.artifacts["IFoo.sol"][0],
          firstSnapshot.artifacts["IFoo.sol"][0],
        );

        // Artifacts from Foo and FooFactory should be different than the first run
        for (const source of ["Foo.sol", "FooFactory.sol"]) {
          assert.notDeepEqual(
            secondSnapshot.artifacts[source][0],
            firstSnapshot.artifacts[source][0],
          );
        }

        // Artifacts for Foo and FooFactory should point to the new build info
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["Foo.sol"][0].path
          ],
          newBuildInfoFoo.buildId,
        );
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["FooFactory.sol"][0].path
          ],
          newBuildInfoFooFactory.buildId,
        );

        // Typefile for IFoo should be the same
        assert.deepEqual(
          secondSnapshot.typeFiles["IFoo.sol"],
          firstSnapshot.typeFiles["IFoo.sol"],
        );

        // Typefiles for Foo and FooFactory should be new
        for (const source of ["Foo.sol", "FooFactory.sol"]) {
          assert.notDeepEqual(
            secondSnapshot.typeFiles[source],
            firstSnapshot.typeFiles[source],
          );
        }
      });
    });
  });
});

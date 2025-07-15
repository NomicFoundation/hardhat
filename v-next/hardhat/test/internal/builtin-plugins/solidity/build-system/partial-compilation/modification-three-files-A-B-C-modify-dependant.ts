/* eslint-disable @typescript-eslint/no-non-null-assertion  -- test */
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("modify a dependant on A->B<-C schema", () => {
    describe("non-isolated mode", function () {
      it("should handle build infos and artifacts appropiately", async () => {
        await using _project = await useTestProjectTemplate({
          name: "test",
          version: "1.0.0",
          files: {
            "contracts/Foo.sol": `import './IFoo.sol';contract Foo is IFoo {}`,
            "contracts/Foo2.sol": `import './IFoo.sol';contract Foo2 is IFoo {}`,
            "contracts/IFoo.sol": `interface IFoo {}`,
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
          `import './IFoo.sol';contract Foo is IFoo { }`,
        );

        // Compile second time
        await project.compile();
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 2, 3, 3);

        // Get a reference to the second build info
        const buildInfo2 = secondSnapshot.buildInfos.find(
          (bi) => bi.buildId !== buildInfo1.buildId,
        )!;

        // The second build info should be different from the first
        assert.notEqual(buildInfo2.buildId, buildInfo1.buildId);

        // New build info should contain only Foo and IFoo
        assert.deepEqual(buildInfo2.sources, ["Foo.sol", "IFoo.sol"]);

        // Artifacts from IFoo and Foo2 should remain unchanged
        assert.deepEqual(
          secondSnapshot.artifacts[`Foo2.sol`][0],
          firstSnapshot.artifacts[`Foo2.sol`][0],
        );
        assert.deepEqual(
          secondSnapshot.artifacts[`IFoo.sol`][0],
          firstSnapshot.artifacts[`IFoo.sol`][0],
        );

        // Artifact for Foo should be new
        assert.notDeepEqual(
          secondSnapshot.artifacts[`Foo.sol`][0],
          firstSnapshot.artifacts[`Foo.sol`][0],
        );

        // Artifact for Foo should point to the new build info
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts[`Foo.sol`][0].path
          ],
          buildInfo2.buildId,
        );

        // IFoo and Foo2 typefiles should remain unchanged
        assert.deepEqual(
          secondSnapshot.typeFiles[`IFoo.sol`],
          firstSnapshot.typeFiles[`IFoo.sol`],
        );
        assert.deepEqual(
          secondSnapshot.typeFiles[`Foo2.sol`],
          firstSnapshot.typeFiles[`Foo2.sol`],
        );

        // Typefile for Foo should be new
        assert.notDeepEqual(
          secondSnapshot.typeFiles[`Foo.sol`],
          firstSnapshot.typeFiles[`Foo.sol`],
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
            "contracts/Foo2.sol": `import './IFoo.sol';contract Foo2 is IFoo {}`,
            "contracts/IFoo.sol": `interface IFoo {}`,
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
        const buildInfoFoo2 = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "Foo2.sol",
        );
        const buildInfoIFoo = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "IFoo.sol",
        );

        // Change Foo.sol
        await writeFile(
          path.join(_project.path, "contracts/Foo.sol"),
          `import './IFoo.sol';contract Foo is IFoo { }`,
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
        const newBuildInfoFoo2 = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Foo2.sol",
        );
        const newBuildInfoIFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "IFoo.sol",
        );

        // IFoo and Foo2 Build infos should be the same
        assert.deepEqual(buildInfoIFoo, newBuildInfoIFoo);
        assert.deepEqual(buildInfoFoo2, newBuildInfoFoo2);

        // Foo build infos should be different
        assert.notEqual(buildInfoFoo.buildId, newBuildInfoFoo.buildId);

        // Each build info should contain the respective sources
        assert.deepEqual(newBuildInfoFoo.sources, ["Foo.sol", "IFoo.sol"]);
        assert.deepEqual(newBuildInfoFoo2.sources, ["Foo2.sol", "IFoo.sol"]);
        assert.deepEqual(newBuildInfoIFoo.sources, ["IFoo.sol"]);

        // Artifacts for IFoo and Foo2 should remain unchanged
        for (const source of ["Foo2.sol", "IFoo.sol"]) {
          assert.deepEqual(
            secondSnapshot.artifacts[source][0],
            firstSnapshot.artifacts[source][0],
          );
        }

        // Artifact for Foo should be new
        assert.notDeepEqual(
          secondSnapshot.artifacts[`Foo.sol`][0],
          firstSnapshot.artifacts[`Foo.sol`][0],
        );

        // Artifacts should point to their respective build infos
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["Foo.sol"][0].path
          ],
          newBuildInfoFoo.buildId,
        );
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["Foo2.sol"][0].path
          ],
          newBuildInfoFoo2.buildId,
        );
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["IFoo.sol"][0].path
          ],
          newBuildInfoIFoo.buildId,
        );

        // Typefiles for IFoo and Foo2 should remain unchanged
        for (const source of ["Foo2.sol", "IFoo.sol"]) {
          assert.deepEqual(
            secondSnapshot.typeFiles[source],
            firstSnapshot.typeFiles[source],
          );
        }

        // Typefile for Foo should be new
        assert.notDeepEqual(
          secondSnapshot.typeFiles[`Foo.sol`],
          firstSnapshot.typeFiles[`Foo.sol`],
        );
      });
    });
  });
});

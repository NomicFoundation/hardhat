import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("delete a dependant on A->B<-C schema", () => {
    describe("non-isolated mode", function () {
      it("should handle build infos and artifacts appropriately", async () => {
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

        // Delete Foo.sol
        await rm(path.join(_project.path, "contracts/Foo.sol"));

        // Compile second time
        await project.compile();
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 1, 2, 2);

        // Get a reference to the second build info
        const [buildInfo2] = secondSnapshot.buildInfos;

        // The second build info should be the same as the first
        assert.deepEqual(buildInfo2, buildInfo1);

        // Build info should contain all sources
        assert.deepEqual(buildInfo2.sources, [
          "Foo.sol",
          "Foo2.sol",
          "IFoo.sol",
        ]);

        // All artifacts should be the same as the first run
        for (const source of ["IFoo.sol", "Foo2.sol"]) {
          assert.deepEqual(
            secondSnapshot.artifacts[source][0],
            firstSnapshot.artifacts[source][0],
          );
        }

        // All typefiles should remain the same
        for (const source of ["IFoo.sol", "Foo2.sol"]) {
          assert.deepEqual(
            secondSnapshot.typeFiles[source],
            firstSnapshot.typeFiles[source],
          );
        }
      });
    });

    describe("isolated mode", function () {
      it("should handle build infos and artifacts appropriately", async () => {
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

        // Delete Foo.sol
        await rm(path.join(_project.path, "contracts/Foo.sol"));

        // Compile second time
        await project.compile({ isolated: true });
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 2, 2, 2);

        // All build infos should be the same
        assert.equal(
          new Set(
            [...firstSnapshot.buildInfos, ...secondSnapshot.buildInfos].map(
              (bi) => bi.buildId,
            ),
          ).size,
          3,
        );

        // All artifacts should be the same as first run
        for (const source of ["IFoo.sol", "Foo2.sol"]) {
          assert.deepEqual(
            secondSnapshot.artifacts[source][0],
            firstSnapshot.artifacts[source][0],
          );
        }

        // All typefiles should be the same as first run
        for (const source of ["IFoo.sol", "Foo2.sol"]) {
          assert.deepEqual(
            secondSnapshot.typeFiles[source],
            firstSnapshot.typeFiles[source],
          );
        }
      });
    });
  });
});

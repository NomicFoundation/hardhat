import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("delete dependency on A->B<-C schema", () => {
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

        // Delete IFoo.sol and update dependants
        await rm(path.join(_project.path, "contracts/IFoo.sol"));
        await writeFile(
          path.join(_project.path, "contracts/Foo.sol"),
          `contract Foo {}`,
        );
        await writeFile(
          path.join(_project.path, "contracts/Foo2.sol"),
          `contract Foo2 {}`,
        );

        // Compile second time
        await project.compile();
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 1, 2, 2);

        // Get a reference to the second build info
        const [buildInfo2] = secondSnapshot.buildInfos;

        // The second build info should be different from the first
        assert.notEqual(buildInfo2.buildId, buildInfo1.buildId);

        // Build info should contain Foo and Foo2
        assert.deepEqual(buildInfo2.sources, ["Foo.sol", "Foo2.sol"]);

        // All artifacts should be different than the first run
        for (const source of ["Foo.sol", "Foo2.sol"]) {
          assert.notDeepEqual(
            secondSnapshot.artifacts[source][0],
            firstSnapshot.artifacts[source][0],
          );
        }

        // All artifacts should point to the new build info
        for (const artifact of Object.values(secondSnapshot.artifacts).flat()) {
          assert.equal(
            secondSnapshot.buildIdReferences[artifact.path],
            buildInfo2.buildId,
          );
        }

        // All typefiles should be new
        for (const source of ["Foo.sol", "Foo2.sol"]) {
          assert.notDeepEqual(
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

        // Delete IFoo.sol and update dependants
        await rm(path.join(_project.path, "contracts/IFoo.sol"));
        await writeFile(
          path.join(_project.path, "contracts/Foo.sol"),
          `contract Foo {}`,
        );
        await writeFile(
          path.join(_project.path, "contracts/Foo2.sol"),
          `contract Foo2 {}`,
        );

        // Compile second time
        await project.compile({ isolated: true });
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 2, 2, 2);

        // Get a reference to each build info
        const newBuildInfoFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Foo.sol",
        );
        const newBuildInfoFoo2 = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Foo2.sol",
        );

        // All build infos should be different
        assert.equal(
          new Set(
            [...firstSnapshot.buildInfos, ...secondSnapshot.buildInfos].map(
              (bi) => bi.buildId,
            ),
          ).size,
          5,
        );

        // Each build info should contain the respective sources
        assert.deepEqual(newBuildInfoFoo.sources, ["Foo.sol"]);
        assert.deepEqual(newBuildInfoFoo2.sources, ["Foo2.sol"]);

        // All artifacts should be different than the first run
        for (const source of ["Foo.sol", "Foo2.sol"]) {
          assert.notDeepEqual(
            secondSnapshot.artifacts[source][0],
            firstSnapshot.artifacts[source][0],
          );
        }

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

        // All typefiles should be new
        for (const source of ["Foo.sol", "Foo2.sol"]) {
          assert.notDeepEqual(
            secondSnapshot.typeFiles[source],
            firstSnapshot.typeFiles[source],
          );
        }
      });
    });
  });
});

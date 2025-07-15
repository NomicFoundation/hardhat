/* eslint-disable @typescript-eslint/no-non-null-assertion -- test */
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("Compiling a subset in a project with two independent files", () => {
    describe("Non-isolated", () => {
      it("generates build infos, artifacts and typefiles appropriately", async () => {
        await using _project = await useTestProjectTemplate({
          name: "test",
          version: "1.0.0",
          files: {
            "contracts/Foo.sol": `contract Foo {}`,
            "contracts/Bar.sol": `contract Bar {}`,
          },
        });
        const hre = await getHRE(_project);
        const project = new TestProjectWrapper(_project, hre);

        // Compile first time
        await project.compile();
        const firstSnapshot = await project.getSnapshot();

        assertFileCounts(firstSnapshot, 1, 2, 2);

        const [buildInfo1] = firstSnapshot.buildInfos;

        // The build info should contain Foo and Bar
        assert.deepEqual(buildInfo1.sources, ["Bar.sol", "Foo.sol"]);

        // Artifacts from Foo and Bar should point to the build info
        for (const artifact of Object.values(firstSnapshot.artifacts).flat()) {
          assert.equal(
            firstSnapshot.buildIdReferences[artifact.path],
            firstSnapshot.buildInfos[0].buildId,
          );
        }

        // Modify Bar.sol
        await writeFile(
          path.join(_project.path, "contracts/Bar.sol"),
          "contract Bar { }",
        );

        // Compile only Bar.sol
        await project.compile({ files: ["contracts/Bar.sol"] });
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 2, 2, 2);

        // Get a reference to the second build info
        const buildInfo2 = secondSnapshot.buildInfos.find(
          (bi) => bi.buildId !== buildInfo1.buildId,
        )!;

        // The second build info should only include Bar.sol
        assert.deepEqual(buildInfo2.sources, ["Bar.sol"]);

        // Artifact for foo should be unchanged
        assert.deepEqual(
          secondSnapshot.artifacts["Foo.sol"][0],
          firstSnapshot.artifacts["Foo.sol"][0],
        );

        // Artifact for Bar should be new
        assert.notDeepEqual(
          secondSnapshot.artifacts["Bar.sol"][0],
          firstSnapshot.artifacts["Bar.sol"][0],
        );

        // Artifact for Bar should point to the new build info
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["Bar.sol"][0].path
          ],
          buildInfo2.buildId,
        );

        // Typefile for Foo should be the same as the first one
        assert.deepEqual(
          firstSnapshot.typeFiles["Foo.sol"],
          secondSnapshot.typeFiles["Foo.sol"],
        );

        // Typefile for Bar should be new
        assert.notDeepEqual(
          firstSnapshot.typeFiles["Bar.sol"],
          secondSnapshot.typeFiles["Bar.sol"],
        );

        // Modify Bar again
        await writeFile(
          path.join(_project.path, "contracts/Bar.sol"),
          "contract Bar {}",
        );

        // Recompile Bar.sol
        await project.compile({ files: ["contracts/Bar.sol"] });
        const thirdSnapshot = await project.getSnapshot();

        // Build info 2 will stay because cleanup is only performed on full compilation
        assertFileCounts(thirdSnapshot, 3, 2, 2);

        // Get a reference to the third build info
        const buildInfo3 = thirdSnapshot.buildInfos.find(
          (bi) =>
            bi.buildId !== buildInfo1.buildId &&
            bi.buildId !== buildInfo2.buildId,
        )!;

        // The third build info should only include Bar.sol
        assert.deepEqual(buildInfo3.sources, ["Bar.sol"]);

        // Artifact for Foo should be unchanged
        assert.deepEqual(
          thirdSnapshot.artifacts["Foo.sol"][0],
          firstSnapshot.artifacts["Foo.sol"][0],
        );

        // Artifact for Bar should be new
        assert.notDeepEqual(
          thirdSnapshot.artifacts["Bar.sol"][0],
          firstSnapshot.artifacts["Bar.sol"][0],
        );

        // Artifact for Bar should point to the new build info
        assert.equal(
          thirdSnapshot.buildIdReferences[
            thirdSnapshot.artifacts["Bar.sol"][0].path
          ],
          buildInfo3.buildId,
        );

        // Typefile for Foo should be the same as the first one
        assert.deepEqual(
          firstSnapshot.typeFiles["Foo.sol"],
          thirdSnapshot.typeFiles["Foo.sol"],
        );

        // Typefile for Bar should be new
        assert.notDeepEqual(
          firstSnapshot.typeFiles["Bar.sol"],
          thirdSnapshot.typeFiles["Bar.sol"],
        );
      });
    });

    describe("Isolated", () => {
      it("generates build infos, artifacts and typefiles appropriately", async () => {
        await using _project = await useTestProjectTemplate({
          name: "test",
          version: "1.0.0",
          files: {
            "contracts/Foo.sol": `contract Foo {}`,
            "contracts/Bar.sol": `contract Bar {}`,
          },
        });
        const hre = await getHRE(_project);
        const project = new TestProjectWrapper(_project, hre);

        // Compile first time
        await project.compile({ isolated: true });
        const firstSnapshot = await project.getSnapshot();

        assertFileCounts(firstSnapshot, 2, 2, 2);

        const buildInfoFoo = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "Foo.sol",
        );
        const buildInfoBar = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "Bar.sol",
        );

        // Each build info should contain the respective sources
        assert.deepEqual(buildInfoFoo.sources, ["Foo.sol"]);
        assert.deepEqual(buildInfoBar.sources, ["Bar.sol"]);

        // Artifacts from Foo should point to its build info
        assert.equal(
          firstSnapshot.buildIdReferences[
            firstSnapshot.artifacts["Foo.sol"][0].path
          ],
          buildInfoFoo.buildId,
        );

        // Artifacts from Bar should point to its build info
        assert.equal(
          firstSnapshot.buildIdReferences[
            firstSnapshot.artifacts["Bar.sol"][0].path
          ],
          buildInfoBar.buildId,
        );

        // Modify Bar.sol
        await writeFile(
          path.join(_project.path, "contracts/Bar.sol"),
          "contract Bar { }",
        );

        // Compile only Bar.sol
        await project.compile({ files: ["contracts/Bar.sol"], isolated: true });
        const secondSnapshot = await project.getSnapshot();

        // There will be 3 build infos since cleanup is performed on full compilation
        assertFileCounts(secondSnapshot, 3, 2, 2);

        const newBuildInfoFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Foo.sol",
        );
        const newBuildInfoBar = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Bar.sol",
        );

        // Foo build info shouldn't change
        assert.deepEqual(buildInfoFoo, newBuildInfoFoo);

        // Bar build info changes
        assert.notEqual(buildInfoBar.buildId, newBuildInfoBar.buildId);

        // New Bar build info includes only Bar.sol
        assert.deepEqual(newBuildInfoBar.sources, ["Bar.sol"]);

        // Artifact for Foo should be unchanged
        assert.deepEqual(
          secondSnapshot.artifacts["Foo.sol"][0],
          firstSnapshot.artifacts["Foo.sol"][0],
        );

        // Artifact for Bar should be new
        assert.notDeepEqual(
          secondSnapshot.artifacts["Bar.sol"][0],
          firstSnapshot.artifacts["Bar.sol"][0],
        );

        // Artifact for Bar should point to the new build info
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["Bar.sol"][0].path
          ],
          newBuildInfoBar.buildId,
        );

        // Typefile for Foo should be the same as the first one
        assert.deepEqual(
          firstSnapshot.typeFiles["Foo.sol"],
          secondSnapshot.typeFiles["Foo.sol"],
        );

        // Typefile for Bar should be new
        assert.notDeepEqual(
          firstSnapshot.typeFiles["Bar.sol"],
          secondSnapshot.typeFiles["Bar.sol"],
        );
      });
    });
  });
});

import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("add a file to a project, then modify both", () => {
    describe("non-isolated mode", function () {
      it("should handle build infos and artifacts appropriately", async () => {
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

        const [buildInfo1] = firstSnapshot.buildInfos;

        // Build info should contain Foo.sol
        assert.deepEqual(buildInfo1.sources, ["Foo.sol"]);

        // Artifact should point to build info
        assert.equal(
          firstSnapshot.buildIdReferences[
            firstSnapshot.artifacts["Foo.sol"][0].path
          ],
          buildInfo1.buildId,
        );

        // There should be the type file
        assert.notEqual(firstSnapshot.typeFiles["Foo.sol"], undefined);

        // Create a new file
        await writeFile(
          path.join(_project.path, "contracts/Bar.sol"),
          "contract Bar {}",
        );

        // Compile second time
        await project.compile();
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 2, 2, 2);

        // Get a reference to the build infos
        const buildInfoBar = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Bar.sol",
        );
        const buildInfoFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Foo.sol",
        );

        // The build info for Foo should be the same as the first one
        assert.deepEqual(buildInfoFoo, buildInfo1);

        // The build info for Bar should be different from Foo
        assert.notEqual(buildInfoBar.buildId, buildInfoFoo.buildId);

        // Build infos should contain only one file each
        assert.deepEqual(buildInfoFoo.sources, ["Foo.sol"]);
        assert.deepEqual(buildInfoBar.sources, ["Bar.sol"]);

        // Artifact for Foo should equal the one from first snapshot
        assert.deepEqual(
          secondSnapshot.artifacts["Foo.sol"],
          firstSnapshot.artifacts["Foo.sol"],
        );

        // Artifacts should point to their respective build infos
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["Foo.sol"][0].path
          ],
          buildInfoFoo.buildId,
        );
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["Bar.sol"][0].path
          ],
          buildInfoBar.buildId,
        );

        // Typefile for Foo should be the same
        assert.deepEqual(
          firstSnapshot.typeFiles["Foo.sol"],
          secondSnapshot.typeFiles["Foo.sol"],
        );

        // There should be a typefile for Bar
        assert.notEqual(secondSnapshot.typeFiles["Bar.sol"], undefined);

        // Modify both Foo and Bar
        await writeFile(
          path.join(_project.path, "contracts/Foo.sol"),
          "contract Foo { }",
        );
        await writeFile(
          path.join(_project.path, "contracts/Bar.sol"),
          "contract Bar { }",
        );

        // Recompile
        await project.compile();
        const thirdSnapshot = await project.getSnapshot();

        assertFileCounts(thirdSnapshot, 1, 2, 2);

        // Build info should include both Foo and Bar
        const [finalBuildInfo] = thirdSnapshot.buildInfos;

        assert.deepEqual(finalBuildInfo.sources, ["Bar.sol", "Foo.sol"]);

        // All artifacts should point to the new build info
        for (const artifact of Object.values(thirdSnapshot.artifacts).flat()) {
          assert.equal(
            thirdSnapshot.buildIdReferences[artifact.path],
            finalBuildInfo.buildId,
          );
        }

        // There should be new type files
        assert.notDeepEqual(
          Object.values(thirdSnapshot.typeFiles).map(
            (tf) => tf.modificationTime,
          ),
          Object.values(secondSnapshot.typeFiles).map(
            (tf) => tf.modificationTime,
          ),
        );
      });
    });

    describe("isolated mode", function () {
      it("should handle build infos and artifacts appropriately", async () => {
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

        const [buildInfo1] = firstSnapshot.buildInfos;

        // Build info should contain Foo.sol
        assert.deepEqual(buildInfo1.sources, ["Foo.sol"]);

        // Artifact should point to build info
        assert.equal(
          firstSnapshot.buildIdReferences[
            firstSnapshot.artifacts["Foo.sol"][0].path
          ],
          buildInfo1.buildId,
        );

        // There should be the type file
        assert.notEqual(firstSnapshot.typeFiles["Foo.sol"], undefined);

        // Create a new file
        await writeFile(
          path.join(_project.path, "contracts/Bar.sol"),
          "contract Bar {}",
        );

        // Compile second time
        await project.compile({ isolated: true });
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 2, 2, 2);

        // Get a reference to the build infos
        const buildInfoBar = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Bar.sol",
        );
        const buildInfoFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Foo.sol",
        );

        // The build info for Foo should be the same as the first one
        assert.deepEqual(buildInfoFoo, buildInfo1);

        // The build info for Bar should be different from Foo
        assert.notEqual(buildInfoBar.buildId, buildInfoFoo.buildId);

        // Build infos should contain only one file each
        assert.deepEqual(buildInfoFoo.sources, ["Foo.sol"]);
        assert.deepEqual(buildInfoBar.sources, ["Bar.sol"]);

        // Artifact for Foo should equal the one from first snapshot
        assert.deepEqual(
          secondSnapshot.artifacts["Foo.sol"],
          firstSnapshot.artifacts["Foo.sol"],
        );

        // Artifacts should point to their respective build infos
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["Foo.sol"][0].path
          ],
          buildInfoFoo.buildId,
        );
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["Bar.sol"][0].path
          ],
          buildInfoBar.buildId,
        );

        // Typefile for Foo should be the same
        assert.deepEqual(
          firstSnapshot.typeFiles["Foo.sol"],
          secondSnapshot.typeFiles["Foo.sol"],
        );

        // There should be a typefile for Bar
        assert.notEqual(secondSnapshot.typeFiles["Bar.sol"], undefined);

        // Modify both Foo and Bar
        await writeFile(
          path.join(_project.path, "contracts/Foo.sol"),
          "contract Foo { }",
        );
        await writeFile(
          path.join(_project.path, "contracts/Bar.sol"),
          "contract Bar { }",
        );

        // Recompile
        await project.compile({ isolated: true });
        const thirdSnapshot = await project.getSnapshot();

        assertFileCounts(thirdSnapshot, 2, 2, 2);

        // There should be new build infos for Foo and Bar
        const newFooBuildInfo = project.getBuildInfoForSourceFile(
          thirdSnapshot,
          "Foo.sol",
        );
        const newBarBuildInfo = project.getBuildInfoForSourceFile(
          thirdSnapshot,
          "Bar.sol",
        );

        assert.notEqual(newFooBuildInfo.buildId, buildInfoFoo.buildId);
        assert.notEqual(newBarBuildInfo.buildId, buildInfoBar.buildId);

        // new build infos should contain only their respective sources
        assert.deepEqual(newFooBuildInfo.sources, ["Foo.sol"]);
        assert.deepEqual(newBarBuildInfo.sources, ["Bar.sol"]);

        // Artifacts for Foo should point to the new Foo build info
        assert.equal(
          thirdSnapshot.buildIdReferences[
            thirdSnapshot.artifacts["Foo.sol"][0].path
          ],
          newFooBuildInfo.buildId,
        );

        // Artifacts for Bar should point to the new Bar build info
        assert.equal(
          thirdSnapshot.buildIdReferences[
            thirdSnapshot.artifacts["Bar.sol"][0].path
          ],
          newBarBuildInfo.buildId,
        );

        // There should be new type files
        assert.notDeepEqual(
          Object.values(thirdSnapshot.typeFiles).map(
            (tf) => tf.modificationTime,
          ),
          Object.values(secondSnapshot.typeFiles).map(
            (tf) => tf.modificationTime,
          ),
        );
      });
    });
  });
});

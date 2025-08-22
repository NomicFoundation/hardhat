import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("add a dependency", () => {
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

        // Create a new file, make Foo depend on it
        await writeFile(
          path.join(_project.path, "contracts/IFoo.sol"),
          "interface IFoo {}",
        );
        await writeFile(
          path.join(_project.path, "contracts/Foo.sol"),
          'import "./IFoo.sol";contract Foo is IFoo {}',
        );

        // Compile second time
        await project.compile();
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 1, 2, 2);

        // Get a reference to the build info
        const [buildInfo] = secondSnapshot.buildInfos;

        // The build info should contain both Foo and IFoo
        assert.deepEqual(buildInfo.sources, ["Foo.sol", "IFoo.sol"]);

        // Both artifacts should point to the build info
        for (const artifact of Object.values(secondSnapshot.artifacts).flat()) {
          assert.equal(
            secondSnapshot.buildIdReferences[artifact.path],
            buildInfo.buildId,
          );
        }

        // Typefile for Foo should be different
        assert.notDeepEqual(
          firstSnapshot.typeFiles["Foo.sol"],
          secondSnapshot.typeFiles["Foo.sol"],
        );

        // There should be a typefile for IFoo
        assert.notEqual(secondSnapshot.typeFiles["IFoo.sol"], undefined);
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
        await project.compile({ defaultBuildProfile: "production" });
        const firstSnapshot = await project.getSnapshot();

        assertFileCounts(firstSnapshot, 1, 1, 1);

        // Create a new file, make Foo depend on it
        await writeFile(
          path.join(_project.path, "contracts/IFoo.sol"),
          "interface IFoo {}",
        );
        await writeFile(
          path.join(_project.path, "contracts/Foo.sol"),
          'import "./IFoo.sol";contract Foo is IFoo {}',
        );

        // Compile second time
        await project.compile({ defaultBuildProfile: "production" });
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 2, 2, 2);

        // Get references to the individual build infos
        const buildInfoFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Foo.sol",
        );
        const buildInfoIFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "IFoo.sol",
        );
        assert.notEqual(buildInfoFoo.buildId, buildInfoIFoo.buildId);

        // Each build info should contain the respective artifacts
        assert.deepEqual(buildInfoFoo.sources, ["Foo.sol", "IFoo.sol"]);
        assert.deepEqual(buildInfoIFoo.sources, ["IFoo.sol"]);

        // Artifacts should point to their build infos
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["Foo.sol"][0].path
          ],
          buildInfoFoo.buildId,
        );
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["IFoo.sol"][0].path
          ],
          buildInfoIFoo.buildId,
        );

        // Typefile for Foo should be different
        assert.notDeepEqual(
          firstSnapshot.typeFiles["Foo.sol"],
          secondSnapshot.typeFiles["Foo.sol"],
        );

        // There should be a typefile for IFoo
        assert.notEqual(secondSnapshot.typeFiles["IFoo.sol"], undefined);
      });
    });
  });
});

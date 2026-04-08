import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { assertFileCounts, getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("modify deepest dependency on A->B->C schema", () => {
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

        // Change IFoo.sol
        await writeFile(
          path.join(_project.path, "contracts/IFoo.sol"),
          "interface IFoo { }",
        );

        // Compile second time
        await project.compile();
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 1, 3, 3);

        // Get a reference to the second build info
        const [buildInfo2] = secondSnapshot.buildInfos;

        // The second build info should be different from the first
        assert.notEqual(buildInfo2.buildId, buildInfo1.buildId);

        // Build info should contain all three sources
        assert.deepEqual(buildInfo2.sources, [
          "Foo.sol",
          "FooFactory.sol",
          "IFoo.sol",
        ]);

        // All three artifacts should be different than the first run
        for (const source of ["Foo.sol", "FooFactory.sol", "IFoo.sol"]) {
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
        for (const source of ["Foo.sol", "FooFactory.sol", "IFoo.sol"]) {
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

        // Change IFoo.sol
        await writeFile(
          path.join(_project.path, "contracts/IFoo.sol"),
          "interface IFoo { }",
        );

        // Compile second time
        await project.compile({ defaultBuildProfile: "production" });
        const secondSnapshot = await project.getSnapshot();

        assertFileCounts(secondSnapshot, 3, 3, 3);

        // Get a reference to each build info
        const buildInfoFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "Foo.sol",
        );
        const buildInfoFooFactory = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "FooFactory.sol",
        );
        const buildInfoIFoo = project.getBuildInfoForSourceFile(
          secondSnapshot,
          "IFoo.sol",
        );

        // All build infos should be different
        assert.equal(
          new Set(
            [...firstSnapshot.buildInfos, ...secondSnapshot.buildInfos].map(
              (bi) => bi.buildId,
            ),
          ).size,
          6,
        );

        // Each build info should contain the respective sources
        assert.deepEqual(buildInfoFooFactory.sources, [
          "Foo.sol",
          "FooFactory.sol",
          "IFoo.sol",
        ]);
        assert.deepEqual(buildInfoFoo.sources, ["Foo.sol", "IFoo.sol"]);
        assert.deepEqual(buildInfoIFoo.sources, ["IFoo.sol"]);

        // All three artifacts should be different than the first run
        for (const source of ["Foo.sol", "FooFactory.sol", "IFoo.sol"]) {
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
          buildInfoFoo.buildId,
        );
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["FooFactory.sol"][0].path
          ],
          buildInfoFooFactory.buildId,
        );
        assert.equal(
          secondSnapshot.buildIdReferences[
            secondSnapshot.artifacts["IFoo.sol"][0].path
          ],
          buildInfoIFoo.buildId,
        );

        // All typefiles should be new
        for (const source of ["Foo.sol", "FooFactory.sol", "IFoo.sol"]) {
          assert.notDeepEqual(
            secondSnapshot.typeFiles[source],
            firstSnapshot.typeFiles[source],
          );
        }
      });
    });
  });
});

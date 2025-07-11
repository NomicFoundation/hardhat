/* eslint-disable no-restricted-syntax -- test*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("Compiling a project from scratch, three files A->B, C", () => {
    describe("Non-isolated", () => {
      it("generates a single build info. no recompilation without changes", async () => {
        await using _project = await useTestProjectTemplate({
          name: "test",
          version: "1.0.0",
          files: {
            "contracts/IFoo.sol": `interface IFoo {}`,
            "contracts/Foo.sol": `import "./IFoo.sol";contract Foo is IFoo {}`,
            "contracts/Bar.sol": `contract Bar {}`,
          },
        });
        const hre = await getHRE(_project);
        const project = new TestProjectWrapper(_project, hre);

        // Compile first time
        await project.compile();
        const snapshot = await project.getSnapshot();

        // There should be only 1 build info
        assert.equal(snapshot.buildInfos.length, 1);
        const [buildInfo1] = snapshot.buildInfos;

        // The build info should contain all 3 files
        assert.deepEqual(buildInfo1.sources, [
          "Bar.sol",
          "Foo.sol",
          "IFoo.sol",
        ]);

        // There should be only 1 build info output
        assert.equal(snapshot.buildInfoOutputs.length, 1);

        // There should be 1 artifact for each file
        assert.equal(snapshot.artifacts["Foo.sol"].length, 1);
        assert.equal(snapshot.artifacts["IFoo.sol"].length, 1);
        assert.equal(snapshot.artifacts["Bar.sol"].length, 1);

        // All artifacts should point to the single build info
        for (const artifact of Object.values(snapshot.artifacts).flat()) {
          assert.equal(
            snapshot.buildIdReferences[artifact.path],
            buildInfo1.buildId,
          );
        }

        // There should be 1 type definition file per source file
        assert.ok(snapshot.typeFiles["Foo.sol"] !== undefined);
        assert.ok(snapshot.typeFiles["IFoo.sol"] !== undefined);
        assert.ok(snapshot.typeFiles["Bar.sol"] !== undefined);

        // Recompile
        await project.compile();
        const secondSnapshot = await project.getSnapshot();

        // Nothing in the snapshot should have changed
        assert.deepEqual(snapshot, secondSnapshot);
      });
    });

    describe("Isolated", () => {
      it("generates three build infos. no recompilation without changes", async () => {
        await using _project = await useTestProjectTemplate({
          name: "test",
          version: "1.0.0",
          files: {
            "contracts/IFoo.sol": `interface IFoo {}`,
            "contracts/Foo.sol": `import "./IFoo.sol";contract Foo is IFoo {}`,
            "contracts/Bar.sol": `contract Bar {}`,
          },
        });
        const hre = await getHRE(_project);
        const project = new TestProjectWrapper(_project, hre);

        // Compile first time
        await project.compile({ isolated: true });
        const firstSnapshot = await project.getSnapshot();

        // There should be 3 build infos
        assert.equal(firstSnapshot.buildInfos.length, 3);

        // There should be 1 artifact for each file
        assert.equal(firstSnapshot.artifacts["Foo.sol"].length, 1);
        assert.equal(firstSnapshot.artifacts["IFoo.sol"].length, 1);
        assert.equal(firstSnapshot.artifacts["Bar.sol"].length, 1);

        // Get build info for each file
        const buildInfoFoo = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "Foo.sol",
        );
        const buildInfoIFoo = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "IFoo.sol",
        );
        const buildInfoBar = project.getBuildInfoForSourceFile(
          firstSnapshot,
          "Bar.sol",
        );

        // Each build info should contain the respective artifacts
        assert.deepEqual(buildInfoFoo.sources, ["Foo.sol", "IFoo.sol"]);
        assert.deepEqual(buildInfoBar.sources, ["Bar.sol"]);
        assert.deepEqual(buildInfoIFoo.sources, ["IFoo.sol"]);

        // There should be 3 build info outputs
        assert.equal(firstSnapshot.buildInfoOutputs.length, 3);

        // Artifacts should point to their build infos
        assert.equal(
          firstSnapshot.buildIdReferences[
            firstSnapshot.artifacts["Foo.sol"][0].path
          ],
          buildInfoFoo.buildId,
        );
        assert.equal(
          firstSnapshot.buildIdReferences[
            firstSnapshot.artifacts["IFoo.sol"][0].path
          ],
          buildInfoIFoo.buildId,
        );
        assert.equal(
          firstSnapshot.buildIdReferences[
            firstSnapshot.artifacts["Bar.sol"][0].path
          ],
          buildInfoBar.buildId,
        );

        // There should be 1 type definition file per source file
        assert.ok(firstSnapshot.typeFiles["Foo.sol"] !== undefined);
        assert.ok(firstSnapshot.typeFiles["IFoo.sol"] !== undefined);
        assert.ok(firstSnapshot.typeFiles["Bar.sol"] !== undefined);

        // Recompile
        await project.compile();
        const secondSnapshot = await project.getSnapshot();

        // Nothing in the snapshot should have changed
        assert.deepEqual(firstSnapshot, secondSnapshot);
      });
    });
  });
});

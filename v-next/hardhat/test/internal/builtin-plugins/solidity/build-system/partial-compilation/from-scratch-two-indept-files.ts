/* eslint-disable no-restricted-syntax -- test*/
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("Compiling a project from scratch, two independent files", () => {
    describe("Non-isolated", () => {
      it("generates a single build info. no recompilation without changes", async () => {
        await using _project = await useTestProjectTemplate({
          name: "test",
          version: "1.0.0",
          files: {
            "contracts/A.sol": `contract A {} contract A2 {}`,
            "contracts/B.sol": `contract B {} contract B2 {}`,
          },
        });
        const hre = await getHRE(_project);
        const project = new TestProjectWrapper(_project, hre);

        // Compile first time
        await project.compile();
        const firstSnapshot = await project.getSnapshot();

        // There should be only 1 build info
        assert.equal(firstSnapshot.buildInfos.length, 1);

        // The build info should contain A and B
        assert.deepEqual(firstSnapshot.buildInfos[0].sources, [
          "A.sol",
          "B.sol",
        ]);

        // There should be only 1 build info output
        assert.equal(firstSnapshot.buildInfoOutputs.length, 1);

        // There should be 2 artifact folders and 2 artifacts each
        assert.equal(firstSnapshot.artifacts["A.sol"].length, 2);
        assert.equal(firstSnapshot.artifacts["B.sol"].length, 2);

        // All artifacts should point to the single build info
        for (const artifact of [
          ...firstSnapshot.artifacts["A.sol"],
          ...firstSnapshot.artifacts["B.sol"],
        ]) {
          assert.equal(
            firstSnapshot.buildIdReferences[artifact.path],
            firstSnapshot.buildInfos[0].buildId,
          );
        }

        // There should be 1 type definition file per source file
        assert.ok(firstSnapshot.typeFiles["A.sol"] !== undefined);
        assert.ok(firstSnapshot.typeFiles["B.sol"] !== undefined);

        // Recompile
        await project.compile();
        const secondSnapshot = await project.getSnapshot();

        // Nothing in the snapshot should have changed
        assert.deepEqual(firstSnapshot, secondSnapshot);
      });
    });

    describe("Isolated", () => {
      it("generates two build infos. no recompilation without changes", async () => {
        await using _project = await useTestProjectTemplate({
          name: "test",
          version: "1.0.0",
          files: {
            "contracts/A.sol": `contract A {} contract A2 {}`,
            "contracts/B.sol": `contract B {} contract B2 {}`,
          },
        });
        const hre = await getHRE(_project);
        const project = new TestProjectWrapper(_project, hre);

        // Compile first time
        await project.compile({ isolated: true });
        const firstSnapshot = await project.getSnapshot();

        // There should be 2 build infos
        assert.equal(firstSnapshot.buildInfos.length, 2);

        // There should be 2 artifact folders and 2 artifacts each
        assert.equal(firstSnapshot.artifacts["A.sol"].length, 2);
        assert.equal(firstSnapshot.artifacts["B.sol"].length, 2);

        // Artifacts from A should point to a build info and artifacts from B to a different one
        const buildInfoAPath =
          firstSnapshot.buildIdReferences[
            firstSnapshot.artifacts["A.sol"][0].path
          ];
        const buildInfoBPath =
          firstSnapshot.buildIdReferences[
            firstSnapshot.artifacts["B.sol"][0].path
          ];
        assert.notEqual(buildInfoAPath, buildInfoBPath);

        for (const artifact of firstSnapshot.artifacts["A.sol"]) {
          assert.equal(
            firstSnapshot.buildIdReferences[artifact.path],
            buildInfoAPath,
          );
        }

        for (const artifact of firstSnapshot.artifacts["B.sol"]) {
          assert.equal(
            firstSnapshot.buildIdReferences[artifact.path],
            buildInfoBPath,
          );
        }

        // There should be 1 type definition file per source file
        assert.ok(firstSnapshot.typeFiles["A.sol"] !== undefined);
        assert.ok(firstSnapshot.typeFiles["B.sol"] !== undefined);

        // Recompile
        await project.compile({ isolated: true });

        const secondSnapshot = await project.getSnapshot();

        // Nothing in the snapshot should have changed
        assert.deepEqual(firstSnapshot, secondSnapshot);
      });
    });
  });
});

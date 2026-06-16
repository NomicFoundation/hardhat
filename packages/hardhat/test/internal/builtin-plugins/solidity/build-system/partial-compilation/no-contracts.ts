import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useTestProjectTemplate } from "../resolver/helpers.js";

import { getHRE, TestProjectWrapper } from "./helpers.js";

describe("Partial compilation", () => {
  describe("Compiling a root file with no contracts", () => {
    it("keeps its build info and does not recompile without changes", async () => {
      await using _project = await useTestProjectTemplate({
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/A.sol": `pragma solidity ^0.8.0;`,
        },
      });
      const hre = await getHRE(_project);
      const project = new TestProjectWrapper(_project, hre);

      await project.compile();
      const snapshot = await project.getSnapshot();

      assert.equal(snapshot.buildInfos.length, 1);
      assert.equal(snapshot.buildInfoOutputs.length, 1);
      assert.deepEqual(snapshot.artifacts, {});
      assert.ok(
        snapshot.typeFiles["A.sol"] !== undefined,
        "A.sol should emit a type file",
      );

      await project.compile();
      const secondSnapshot = await project.getSnapshot();

      assert.deepEqual(snapshot, secondSnapshot);
    });
  });
});

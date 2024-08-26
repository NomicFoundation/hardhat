import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

describe("Hardhat Mocha plugin", () => {
  describe("Success", () => {
    useFixtureProject("test-project");

    it("should work", async () => {
      const hre = await import("@ignored/hardhat-vnext");

      const result = await hre.tasks.getTask("test").run({});

      assert.equal(result, 0);
    });
  });

  describe("Failure", () => {
    useFixtureProject("invalid-mocha-config");

    it("should fail", async () => {
      await assert.rejects(
        () => import("@ignored/hardhat-vnext"),
        /Config error in config\.mocha\.delay: Expected boolean, received number/,
      );
    });
  });
});

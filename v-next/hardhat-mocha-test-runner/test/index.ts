import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

describe("Hardhat Mocha plugin", () => {
  useFixtureProject("test-project");

  it("should work", async () => {
    const hre = await import("@ignored/hardhat-vnext");

    const result = await hre.tasks.getTask("test").run({});

    assert.equal(result, 0);
  });
});

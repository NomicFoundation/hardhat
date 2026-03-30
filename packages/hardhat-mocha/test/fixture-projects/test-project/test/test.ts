import assert from "node:assert/strict";

import hre from "hardhat";
import { describe, it } from "mocha";

describe("Mocha test", () => {
  it("should work", () => {
    assert.equal(1 + 1, 2);
  });

  it("should have the test task", () => {
    // throws if the task doesn't exist
    hre.tasks.getTask("test");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "mocha";

import hre from "hardhat";

describe("Other mocha test", () => {
  it("should have the example task", () => {
    assert.ok(hre.tasks.getTask("empty"));
  });
});

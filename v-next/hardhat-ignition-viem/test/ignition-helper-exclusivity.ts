/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import path from "path";

describe("ignition helper mutual exclusivity", () => {
  let originalCwd: string;
  before(function () {
    originalCwd = process.cwd();

    process.chdir(
      path.join(__dirname, "./fixture-projects", "with-fake-helper")
    );
  });

  after(function () {
    process.chdir(originalCwd);
  });

  it("should error when loaded in conjunction with hardhat-ignition-ethers", async function () {
    assert.throws(
      () => require("hardhat"),
      /Found ethers and viem, but only one Hardhat Ignition extension plugin can be used at a time\./
    );
  });
});

/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "./test-helpers/use-ignition-project.js";

/**
 * A project that only imports `@nomicfoundation/hardhat-ignition` will not add
 * a `hre.ignition` property to the Hardhat Runtime Environment.
 * We warn that you need to install either the viem or ethers plugin to get
 * Ignition support in tests or scripts.
 */
describe("ignition helper guard", () => {
  useEphemeralIgnitionProject("minimal");

  it("should error on attempting to use `hre.ignition` without viem/ethers plugins installed", function () {
    assert.throws(
      () => (this.hre as any).originalIgnition.deploy(),
      /Please install either `@nomicfoundation\/hardhat-ignition-viem` or `@nomicfoundation\/hardhat-ignition-ethers` to use Ignition in your Hardhat tests/,
    );
  });
});

/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

// TODO: Bring back with Hardhat 3 fixtures
describe.skip("gas estimation", function () {
  useEphemeralIgnitionProject("minimal");

  it("should throw with simulation error if sender account has less ETH than gas estimate", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const foo = m.contract("Fails");

      return { foo };
    });

    await this.hre.network.provider.send("hardhat_setBalance", [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "0x1",
    ]);

    await assert.isRejected(
      this.hre.ignition.deploy(moduleDefinition),
      /Simulating the transaction failed with error: Reverted with reason "Constructor failed"/,
    );
  });
});

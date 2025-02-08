/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../../test-helpers/use-ignition-project.js";

/**
 * On running a deploy, if a transaction fails simulation, we should
 * revert the allocated nonce and complete the rest of the batch.
 *
 * This test ensures that the nonce is reverted and the rest of the batch completes
 * because the second transaction does not fail the nonce check.
 */
// TODO: Bring back with Hardhat 3 fixtures
describe.skip("execution - revert nonce on simulation error", () => {
  useEphemeralIgnitionProject("minimal");

  it("should raise the simulation error if there are multiple transactions in a batch and fails simulation", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      // batch 1
      const foo = m.contract("FailureCalls");

      // batch 2
      m.call(foo, "fails");
      m.call(foo, "doesNotFail");

      return { foo };
    });

    // We check that it doesn't fail because of a nonce validation,
    // but because of the actual simulation
    await assert.isRejected(
      this.ignition.deploy(moduleDefinition),
      /Simulating the transaction failed with error: Reverted with reason "fails"/,
    );
  });
});

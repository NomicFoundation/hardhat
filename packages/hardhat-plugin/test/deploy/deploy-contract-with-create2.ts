/* eslint-disable import/no-unused-modules */
import {
  DeploymentStrategyType,
  buildModule,
} from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { mineBlock } from "../test-helpers/mine-block";
import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project";
import { waitForPendingTxs } from "../test-helpers/wait-for-pending-txs";

/**
 * This is the simplest contract deploy case.
 *
 * Deploy a single contract with non-problematic network
 */
describe("execution - deploy contract with create2", function () {
  useEphemeralIgnitionProject("minimal");

  // eslint-disable-next-line no-only-tests/no-only-tests
  it("should deploy a contract that is callable via create2", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
      strategy: DeploymentStrategyType.CREATE2,
    });

    await waitForPendingTxs(this.hre, 1, deployPromise);
    await mineBlock(this.hre);

    const result = await deployPromise;

    assert.equal(
      result.foo.address,
      "0x4b7DcD8BCc106E5Cd7e89837A24BF27cca252C39"
    );

    assert.equal(await result.foo.read.x(), Number(1));
  });
});

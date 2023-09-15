/* eslint-disable import/no-unused-modules */
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import {
  TestChainHelper,
  useEphemeralIgnitionProject,
} from "../use-ignition-project";

/**
 * Use an existingly deployed contract through the `contractAt` api.
 *
 * First deploy a working contract, then reuse it from a subsequent module.
 */
describe("execution - deploy contract at", function () {
  useEphemeralIgnitionProject("minimal");

  it.skip("should deploy a contract that is callable", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const result = await this.runControlledDeploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        await c.mineBlock(1);
      }
    );

    const fooAddress = await result.foo.getAddress();

    assert.equal(fooAddress, "0x5FbDB2315678afecb367f032d93F642f64180aa3");

    const contractAtModuleDefinition = buildModule("FooModule", (m) => {
      const foo = m.contractAt("Foo", fooAddress);

      return { foo };
    });

    const contractAtResult = await this.runControlledDeploy(
      contractAtModuleDefinition,
      async (c: TestChainHelper) => {
        await c.mineBlock(1);
      }
    );

    assert.equal(await contractAtResult.foo.x(), Number(1));
  });
});

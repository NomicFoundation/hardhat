/* eslint-disable import/no-unused-modules */
import { buildModule, status } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import {
  TestChainHelper,
  useFileIgnitionProject,
} from "./use-ignition-project";

/**
 * This is the simplest contract deploy case.
 *
 * Deploy a single contract with non-problematic network
 */
describe("status", function () {
  const emptyResult = {
    started: [],
    timedOut: [],
    held: [],
    failed: [],
    successful: [],
    contracts: {},
  };

  describe("when there are failed futures", function () {
    useFileIgnitionProject("minimal", "status-tests-failed");

    it("should show successfully deployed contracts", async function () {
      const moduleDefinition = buildModule("FooModule", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      await this.runControlledDeploy(
        moduleDefinition,
        async (c: TestChainHelper) => {
          await c.mineBlock(1);
        }
      );

      const statusResult = await status(this.deploymentDir!);

      assert.deepStrictEqual(statusResult, {
        ...emptyResult,
        successful: ["FooModule#Foo"],
        contracts: {
          "FooModule#Foo": {
            id: "FooModule#Foo",
            contractName: "Foo",
            address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          },
        },
      });
    });

    it("should show simulation errors as started futures", async function () {
      const moduleDefinition = buildModule("FooModule", (m) => {
        const foo = m.contract("Foo");

        m.call(foo, "incByPositiveNumber", [0]);

        return { foo };
      });

      let didError = false;
      try {
        await this.runControlledDeploy(
          moduleDefinition,
          async (c: TestChainHelper) => {
            await c.mineBlock(1);
          }
        );
      } catch (e) {
        didError = true;
      }

      assert(didError, "Error deployment didn't happen and its a prerequisite");

      const statusResult = await status(this.deploymentDir!);

      assert.deepStrictEqual(statusResult, {
        ...emptyResult,
        successful: ["FooModule#Foo"],
        started: ["FooModule#Foo.incByPositiveNumber"],
        contracts: {
          "FooModule#Foo": {
            id: "FooModule#Foo",
            contractName: "Foo",
            address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          },
        },
      });
    });
  });

  describe("when there are timed out futures", function () {
    useFileIgnitionProject("minimal", "status-tests-timed-out", {
      blockPollingInterval: 1_000,
      timeBeforeBumpingFees: 0,
      maxFeeBumps: 0,
      requiredConfirmations: 1,
    });

    it("should show timed out futures", async function () {
      const moduleDefinition = buildModule("FooModule", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      let didError = false;
      try {
        await this.runControlledDeploy(
          moduleDefinition,
          async (c: TestChainHelper) => {
            await c.mineBlock(1);
          }
        );
      } catch (e) {
        didError = true;
      }

      assert(didError, "Error deployment didn't happen and its a prerequisite");

      const statusResult = await status(this.deploymentDir!);

      assert.deepStrictEqual(statusResult, {
        ...emptyResult,
        timedOut: [
          {
            futureId: "FooModule#Foo",
            networkInteractionId: 1,
          },
        ],
      });
    });
  });
});

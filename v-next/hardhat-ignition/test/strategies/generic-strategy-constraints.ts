import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { mineBlock } from "../test-helpers/mine-block.js";
import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";
import { waitForPendingTxs } from "../test-helpers/wait-for-pending-txs.js";

const strategies = ["basic", "create2"] as const;

const exampleConfig = {
  basic: {},
  create2: {
    salt: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  },
} as const;

// TODO: Bring back with Hardhat 3 fixtures
describe.skip("strategies - generic constraints", function () {
  strategies.forEach((strategy) => {
    describe(strategy, function () {
      useEphemeralIgnitionProject("minimal");

      it("should deploy a contract", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("Foo");

          return { foo };
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy,
          strategyConfig: exampleConfig[strategy],
        });

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.isDefined(result.foo.address);

        assert.equal(await result.foo.read.x(), Number(1));
      });

      it("should deploy multiple contracts", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("Foo");
          const bar = m.contract("Bar");

          return { foo, bar };
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy,
          strategyConfig: exampleConfig[strategy],
        });

        await waitForPendingTxs(this.hre, 2, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.isDefined(result.foo.address);
        assert.isDefined(result.bar.address);

        assert.equal(await result.foo.read.x(), Number(1));
        assert.equal(await result.bar.read.isBar(), true);
      });

      it("should call a contract function", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("Foo");

          m.call(foo, "inc");

          return { foo };
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy,
          strategyConfig: exampleConfig[strategy],
        });

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);
        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.isDefined(result.foo.address);

        assert.equal(await result.foo.read.x(), Number(2));
      });

      it("should static call a contract function", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("Foo");

          const firstInc = m.call(foo, "inc", [], { id: "inc1" });
          const secondInc = m.call(foo, "inc", [], {
            id: "inc2",
            after: [firstInc],
          });

          const counter = m.staticCall(foo, "x", [], 0, {
            id: "inc3",
            after: [secondInc],
          });

          m.call(foo, "incByPositiveNumber", [counter]);

          return { foo };
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy,
          strategyConfig: exampleConfig[strategy],
        });

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);
        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);
        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);
        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.isDefined(result.foo.address);

        assert.equal(await result.foo.read.x(), Number(6));
      });

      it("should support using existing contracts", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("Foo");

          return { foo };
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition);

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        const fooAddress = result.foo.address;

        const contractAtDefinition = buildModule("ContractAtModule", (m) => {
          const contractAtFoo = m.contractAt("Foo", fooAddress);

          m.call(contractAtFoo, "inc");

          return { contractAtFoo };
        });

        const contractAtPromise = this.hre.ignition.deploy(
          contractAtDefinition,
          {
            strategy,
            strategyConfig: exampleConfig[strategy],
          },
        );

        await waitForPendingTxs(this.hre, 1, contractAtPromise);
        await mineBlock(this.hre);

        const contractAtResult = await contractAtPromise;

        assert.equal(await contractAtResult.contractAtFoo.read.x(), Number(2));
      });

      it("should read an event emitted from a constructor", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("EventArgValue");

          const arg = m.readEventArgument(foo, "EventValue", "value");

          // will revert if the event argument is not equal to 42
          m.call(foo, "validateEmitted", [arg]);

          return { foo };
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy,
          strategyConfig: exampleConfig[strategy],
        });

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);
        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.isDefined(result.foo.address);

        assert.equal(await result.foo.read.argWasValidated(), true);
      });

      it("should read an event emitted from a function", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("SendDataEmitter");

          const eventCall = m.call(foo, "emitEvent");

          const arg = m.readEventArgument(eventCall, "SendDataEvent", "arg", {
            emitter: foo,
          });

          // will revert if the event argument is not equal to 42
          m.call(foo, "validateEmitted", [arg]);

          return { foo };
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy,
          strategyConfig: exampleConfig[strategy],
        });

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);
        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);
        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.isDefined(result.foo.address);

        assert.equal(await result.foo.read.wasEmitted(), true);
      });
    });
  });
});

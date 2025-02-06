/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

// TODO: Bring back with Hardhat 3 fixtures
describe.skip("static calls", () => {
  useEphemeralIgnitionProject("minimal");

  it("should be able to use the output of a static call in a contract at", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const newAddress = m.staticCall(fooFactory, "deployed", [], 0, {
        after: [createCall],
      });

      const foo = m.contractAt("Foo", newAddress);

      return { fooFactory, foo };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    assert.equal(await result.fooFactory.read.isDeployed(), true);
    assert.equal(await result.foo.read.x(), 1n);
  });

  it("should be able to use the output of a static call in an artifact contract at", async function () {
    const artifact = await this.hre.artifacts.readArtifact("Foo");

    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const newAddress = m.staticCall(fooFactory, "deployed", [], 0, {
        after: [createCall],
      });

      const foo = m.contractAt("Foo", artifact, newAddress);

      return { fooFactory, foo };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    assert.equal(await result.fooFactory.read.isDeployed(), true);
    assert.equal(await result.foo.read.x(), 1n);
  });

  it("should be able to use the output of a static call function in a contract at (with arg)", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const newAddress = m.staticCall(fooFactory, "allDeployed", [0], 0, {
        after: [createCall],
      });

      const foo = m.contractAt("Foo", newAddress);

      return { fooFactory, foo };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    assert.equal(await result.fooFactory.read.isDeployed(), true);
    assert.equal(await result.foo.read.x(), 1n);
  });

  it("should be able to use the output of a static call function in a contract at (with function signature)", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const newAddress = m.staticCall(
        fooFactory,
        "getDeployed(uint256)",
        [0],
        0,
        {
          after: [createCall],
        },
      );

      const foo = m.contractAt("Foo", newAddress);

      return { fooFactory, foo };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    assert.equal(await result.fooFactory.read.isDeployed(), true);
    assert.equal(await result.foo.read.x(), 1n);
  });

  it("should be able to use the output of a static call with an indexed tuple result", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const tupleContract = m.contract("TupleReturn");

      const arg1 = m.staticCall(tupleContract, "getTuple", [], "arg1", {
        id: "arg1",
      });
      const arg2 = m.staticCall(tupleContract, "getTuple", [], "arg2", {
        id: "arg2",
      });

      m.call(tupleContract, "verifyArg1", [arg1], { id: "call1" });
      m.call(tupleContract, "verifyArg2", [arg2], { id: "call2" });

      return { tupleContract };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    assert.equal(await result.tupleContract.read.arg1Captured(), true);
    assert.equal(await result.tupleContract.read.arg2Captured(), true);
  });

  it("should not be able to use the output of a non-address static call in a contract at", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const nonAddress = m.staticCall(fooFactory, "nonAddressResult", [], 0, {
        after: [createCall],
      });

      const foo = m.contractAt("Foo", nonAddress);

      return { fooFactory, foo };
    });

    await assert.isRejected(
      this.hre.ignition.deploy(moduleDefinition),
      /Future 'FooModule#FooFactory.nonAddressResult' must be a valid address/,
    );
  });

  it("should not be able to use the output of a non-address static call in an artifact contract at", async function () {
    const artifact = await this.hre.artifacts.readArtifact("Foo");

    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const nonAddress = m.staticCall(fooFactory, "nonAddressResult", [], 0, {
        after: [createCall],
      });

      const foo = m.contractAt("Foo", artifact, nonAddress);

      return { fooFactory, foo };
    });

    await assert.isRejected(
      this.hre.ignition.deploy(moduleDefinition),
      /Future 'FooModule#FooFactory.nonAddressResult' must be a valid address/,
    );
  });
});

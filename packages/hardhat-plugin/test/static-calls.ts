/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("static calls", () => {
  useEphemeralIgnitionProject("minimal-new-api");

  it("should be able to use the output of a static call in a contract at", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const newAddress = m.staticCall(fooFactory, "deployed", [], {
        after: [createCall],
      });

      const foo = m.contractAt("Foo", newAddress);

      return { fooFactory, foo };
    });

    const result = await this.deploy(moduleDefinition);

    assert.equal(await result.fooFactory.isDeployed(), true);
    assert.equal(await result.foo.x(), Number(1));
  });

  it("should be able to use the output of a static call in an artifact contract at", async function () {
    const artifact = await this.hre.artifacts.readArtifact("Foo");

    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const newAddress = m.staticCall(fooFactory, "deployed", [], {
        after: [createCall],
      });

      const foo = m.contractAtFromArtifact("Foo", newAddress, artifact);

      return { fooFactory, foo };
    });

    const result = await this.deploy(moduleDefinition);

    assert.equal(await result.fooFactory.isDeployed(), true);
    assert.equal(await result.foo.x(), Number(1));
  });

  it("should be able to use the output of a static call function in a contract at (with arg)", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const newAddress = m.staticCall(fooFactory, "allDeployed", [0], {
        after: [createCall],
      });

      const foo = m.contractAt("Foo", newAddress);

      return { fooFactory, foo };
    });

    const result = await this.deploy(moduleDefinition);

    assert.equal(await result.fooFactory.isDeployed(), true);
    assert.equal(await result.foo.x(), Number(1));
  });

  it("should be able to use the output of a static call function in a contract at (with function signature)", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const newAddress = m.staticCall(fooFactory, "getDeployed(uint256)", [0], {
        after: [createCall],
      });

      const foo = m.contractAt("Foo", newAddress);

      return { fooFactory, foo };
    });

    const result = await this.deploy(moduleDefinition);

    assert.equal(await result.fooFactory.isDeployed(), true);
    assert.equal(await result.foo.x(), Number(1));
  });

  it("should not be able to use the output of a non-address static call in a contract at", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const nonAddress = m.staticCall(fooFactory, "nonAddressResult", [], {
        after: [createCall],
      });

      const foo = m.contractAt("Foo", nonAddress);

      return { fooFactory, foo };
    });

    await assert.isRejected(
      this.deploy(moduleDefinition),
      /Future 'FooModule:FooFactory#nonAddressResult' must be a valid address/
    );
  });

  it("should not be able to use the output of a non-address static call in an artifact contract at", async function () {
    const artifact = await this.hre.artifacts.readArtifact("Foo");

    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const nonAddress = m.staticCall(fooFactory, "nonAddressResult", [], {
        after: [createCall],
      });

      const foo = m.contractAtFromArtifact("Foo", nonAddress, artifact);

      return { fooFactory, foo };
    });

    await assert.isRejected(
      this.deploy(moduleDefinition),
      /Future 'FooModule:FooFactory#nonAddressResult' must be a valid address/
    );
  });
});

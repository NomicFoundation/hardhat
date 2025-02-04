/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project";

describe("module parameters", () => {
  useEphemeralIgnitionProject("minimal");

  it("should be able to retrieve a default number", async function () {
    const moduleDefinition = buildModule("WithDefaultModule", (m) => {
      const myNumber = m.getParameter("MyNumber", 42);

      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", [myNumber]);

      return { foo };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    const v = await result.foo.read.x();

    assert.equal(v, 43n);
  });

  it("should be able to override a default number", async function () {
    const moduleDefinition = buildModule("WithDefaultModule", (m) => {
      const myNumber = m.getParameter("MyNumber", 10);

      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", [myNumber]);

      return { foo };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition, {
      parameters: {
        WithDefaultModule: {
          MyNumber: 20,
        },
      },
    });

    assert.equal(await result.foo.read.x(), 21n);
  });

  it("should be able to retrieve a default string", async function () {
    const moduleDefinition = buildModule("WithDefaultStringModule", (m) => {
      const myString = m.getParameter("MyString", "Example");

      const greeter = m.contract("Greeter", [myString]);

      return { greeter };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    const v = await result.greeter.read.getGreeting();

    assert.equal(v, "Example");
  });

  it("should be able to override a default string", async function () {
    const moduleDefinition = buildModule("WithDefaultStringModule", (m) => {
      const myString = m.getParameter("MyString", "Example");

      const greeter = m.contract("Greeter", [myString]);

      return { greeter };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition, {
      parameters: {
        WithDefaultStringModule: {
          MyString: "NotExample",
        },
      },
    });

    assert.equal(await result.greeter.read.getGreeting(), "NotExample");
  });

  it("should be able to retrieve a default AccountRuntimeValue", async function () {
    const moduleDefinition = buildModule("WithDefaultAccountModule", (m) => {
      const newOwner = m.getParameter("newOwner", m.getAccount(1));

      const ownerContract = m.contract("Owner", [], { from: m.getAccount(0) });

      m.call(ownerContract, "setOwner", [newOwner]);

      return { ownerContract };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    const v = (await result.ownerContract.read.owner()) as string;

    const accounts = await this.hre.network.provider.send("eth_accounts");

    assert.equal(v.toLowerCase(), accounts[1]);
  });

  it("should be able to override a default AccountRuntimeValue", async function () {
    const moduleDefinition = buildModule("WithDefaultAccountModule", (m) => {
      const newOwner = m.getParameter("newOwner", m.getAccount(1));

      const ownerContract = m.contract("Owner", [], { from: m.getAccount(0) });

      m.call(ownerContract, "setOwner", [newOwner]);

      return { ownerContract };
    });

    const accounts = await this.hre.network.provider.send("eth_accounts");

    const result = await this.hre.ignition.deploy(moduleDefinition, {
      parameters: {
        WithDefaultAccountModule: {
          newOwner: accounts[2],
        },
      },
    });

    const v = (await result.ownerContract.read.owner()) as string;

    assert.equal(v.toLowerCase(), accounts[2]);
  });
});

describe("params validation", () => {
  useEphemeralIgnitionProject("minimal");

  it("should throw if no parameters object provided", async function () {
    await this.hre.run("compile", { quiet: true });

    const userModule = buildModule("UserModule", (m) => {
      const myNumber = m.getParameter("MyNumber");

      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", [myNumber]);

      return { foo };
    });

    const deployPromise = this.hre.ignition.deploy(userModule);

    await assert.isRejected(
      deployPromise,
      "Module parameter 'MyNumber' requires a value but was given none"
    );
  });

  it("should throw if parameter missing from parameters", async function () {
    await this.hre.run("compile", { quiet: true });

    const userModule = buildModule("UserModule", (m) => {
      const myNumber = m.getParameter("MyNumber");

      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", [myNumber]);

      return { foo };
    });

    const deployPromise = this.hre.ignition.deploy(userModule, {
      parameters: {
        UserModule: {
          NotMyNumber: 11,
        },
      },
    });

    await assert.isRejected(
      deployPromise,
      "Module parameter 'MyNumber' requires a value but was given none"
    );
  });
});

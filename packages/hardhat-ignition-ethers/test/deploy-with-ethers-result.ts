/* eslint-disable import/no-unused-modules */
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

import { externallyLoadedContractArtifact } from "./test-helpers/externally-loaded-contract";

const fixtureProjectName = "minimal";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
  }
}

describe("deploy with ethers result", () => {
  beforeEach("Load environment", async function () {
    process.chdir(
      path.join(__dirname, "./fixture-projects", fixtureProjectName)
    );

    const hre = require("hardhat");

    await hre.network.provider.send("evm_setAutomine", [true]);
    await hre.run("compile", { quiet: true });

    this.hre = hre;
  });

  afterEach("reset hardhat context", function () {
    resetHardhatContext();
  });

  it("should get return ethers result from deploy", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");
      const fooAt = m.contractAt("Foo", foo, { id: "FooAt" });

      return { foo, fooAt };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    assert.equal(await result.foo.x(), 1n);
    assert.equal(await result.fooAt.x(), 1n);
  });

  it("should get return a deployed contract as an ethers contract instance", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    assert.equal(await result.foo.x(), 1n);
  });

  it("should get return a contractAt as an ethers contract instance", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");
      const contractAtFoo = m.contractAt("Foo", foo, { id: "ContractAtFoo" });

      return { contractAtFoo };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    assert.equal(await result.contractAtFoo.x(), 1n);
  });

  it("should return a contract loaded from an arbitrary artifact as an ethers instance", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const externallyLoadedContract = m.contract(
        "ExternallyLoadedContract",
        externallyLoadedContractArtifact,
        [],
        { id: "ExternallyLoadedContract" }
      );

      return { externallyLoadedContract };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    assert.isTrue(await result.externallyLoadedContract.isExternallyLoaded());
  });

  it("should differentiate between different contracts in the type system", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");
      const bar = m.contract("Bar");

      return { foo, bar };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    assert.isTrue(await result.foo.isFoo());
    assert.isTrue(await result.bar.isBar());

    // A function on the abi will not be defined on the ethers contract,
    // but more importantly this should how up as a type error.

    // TODO: add @ts-expect-error when we have typescript support
    assert.isUndefined(result.foo.isBar);
    assert.isUndefined(result.bar.isFoo);
  });
});

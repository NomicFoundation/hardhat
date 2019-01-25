import { BuidlerRuntimeEnvironment } from "buidler/types";
import { assert } from "chai";

import { TruffleEnvironmentArtifacts } from "../src/artifacts";
import { TruffleContract, TruffleContractInstance } from "../src/types";

// This is copied from buidler-web3
// It's here because ts-node seems to ignore type extensions
// made by our dependencies.
// TODO: Open an issue in ts-node once this is on github.
declare module "buidler/types" {
  interface BuidlerRuntimeEnvironment {
    Web3: any;
    web3: any;
  }
}

declare module "mocha" {
  interface Context {
    env: BuidlerRuntimeEnvironment;
  }
}

function assertIsContract(contract: TruffleContract) {
  assert.containsAllKeys(contract, [
    "new",
    "at",
    "defaults",
    "detectNetwork",
    "deployed",
    "link"
  ]);
}

function assertIsContractInstance(
  contractInstance: TruffleContractInstance,
  ...functionNames: string[]
) {
  assert.containsAllKeys(contractInstance, [
    "address",
    "abi",
    ...functionNames
  ]);
}

function testArtifactsFunctionality() {
  it("Should load existing contracts successfully", function() {
    assertIsContract(this.env.artifacts.require("Greeter"));
    assertIsContract(this.env.artifacts.require("Lib"));
    assertIsContract(this.env.artifacts.require("UsesLib"));
  });

  it("Should set a default sender to contract deployments", async function() {
    const Greeter = this.env.artifacts.require("Greeter");
    const greeter = await Greeter.new();

    assertIsContractInstance(greeter, "greet", "setGreeting");

    const Lib = this.env.artifacts.require("Lib");
    const lib = await Lib.new();
    assertIsContractInstance(lib, "addOne");
  });

  it("Should set a default sender to the contract's functions", async function() {
    const Greeter = this.env.artifacts.require("Greeter");
    const greeter = await Greeter.new();

    assert.equal(await greeter.greet(), "Hi");

    await greeter.setGreeting("Hi!!!");
    assert.equal(await greeter.greet(), "Hi!!!");
  });

  it("Should work with Contract.at", async function() {
    const Greeter = this.env.artifacts.require("Greeter");
    const greeter = await Greeter.new();
    const greeterWithAt = await Greeter.at(greeter.address);

    assertIsContractInstance(greeterWithAt, "greet");

    assert.equal(await greeterWithAt.greet(), "Hi");

    await greeterWithAt.setGreeting("Hi!!!");
    assert.equal(await greeterWithAt.greet(), "Hi!!!");
  });

  it("Should work with new Contract(addr)", async function() {
    const Greeter = this.env.artifacts.require("Greeter");
    const greeter = await Greeter.new();

    const greeterWithNew = new Greeter(greeter.address);

    assertIsContractInstance(greeterWithNew, "greet");

    assert.equal(await greeterWithNew.greet(), "Hi");

    await greeterWithNew.setGreeting("Hi!!!");
    assert.equal(await greeterWithNew.greet(), "Hi!!!");
  });

  it("Should provison cloned contracts", async function() {
    const Greeter = this.env.artifacts.require("Greeter");
    const ClonedGreeter = Greeter.clone();
    const greeter = await ClonedGreeter.new();

    assertIsContractInstance(greeter, "greet");

    assert.equal(await greeter.greet(), "Hi");

    await greeter.setGreeting("Hi!!!");
    assert.equal(await greeter.greet(), "Hi!!!");
  });

  it("Should fail to deploy an unlinked contract", async function() {
    const UsesLib = this.env.artifacts.require("UsesLib");

    try {
      await UsesLib.new();
      assert.fail("UsesLib shouldn't be deployeable if not linked");
    } catch (error) {
      assert.include(error.message, "UsesLib contains unresolved libraries");
    }
  });

  it("Should deploy linked contracts succesfully", async function() {
    const Lib = this.env.artifacts.require("Lib");
    const lib = await Lib.new();
    assertIsContractInstance(lib, "addOne");

    const UsesLib = this.env.artifacts.require("UsesLib");

    UsesLib.link(lib);

    const usesLib = await UsesLib.new();

    assertIsContractInstance(usesLib, "n", "addTwo");

    assert.equal((await usesLib.n()).toString(), "0");

    await usesLib.addTwo();
    assert.equal((await usesLib.n()).toString(), "2");
  });
}

describe("BuidlerRuntimeEnvironment extension", function() {
  before("Buidler project setup", function() {
    process.chdir(__dirname + "/buidler-project-solc-0.5");
    process.env.BUIDLER_NETWORK = "develop";

    delete require.cache[require.resolve("buidler")];
    this.env = require("buidler");
  });

  it("It should add the artifacts object", function() {
    assert.instanceOf(this.env.artifacts, TruffleEnvironmentArtifacts);
  });
});

describe("TruffleContracts loading and provisioning", function() {
  describe("When compiling with solc 0.5.x", function() {
    before("Buidler project setup", function() {
      process.chdir(__dirname + "/buidler-project-solc-0.5");
      process.env.BUIDLER_NETWORK = "develop";

      delete require.cache[require.resolve("buidler")];
      this.env = require("buidler");
    });

    testArtifactsFunctionality();
  });

  describe("When compiling with solc 0.4.x", function() {
    before("Buidler project setup", function() {
      process.chdir(__dirname + "/buidler-project-solc-0.4");
      process.env.BUIDLER_NETWORK = "develop";

      delete require.cache[require.resolve("buidler")];
      this.env = require("buidler");
    });

    testArtifactsFunctionality();
  });
});

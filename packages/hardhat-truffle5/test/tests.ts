import { assert } from "chai";
import * as fs from "fs";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

import { DEFAULT_GAS_MULTIPLIER } from "../src/constants";
import { TruffleContract, TruffleContractInstance } from "../src/types";

import { useEnvironment } from "./helpers";

function assertIsContract(contract: TruffleContract) {
  assert.containsAllKeys(contract, [
    "new",
    "at",
    "defaults",
    "detectNetwork",
    "deployed",
    "link",
  ]);
}

function assertIsContractInstance(
  contractInstance: TruffleContractInstance,
  ...functionNames: string[]
) {
  assert.containsAllKeys(contractInstance, [
    "address",
    "abi",
    ...functionNames,
  ]);
}

function testArtifactsFunctionality() {
  it("Should load existing contracts successfully", function () {
    assertIsContract(this.env.artifacts.require("Greeter"));
    assertIsContract(this.env.artifacts.require("Lib"));
    assertIsContract(this.env.artifacts.require("UsesLib"));
  });

  it("Should set a default sender to contract deployments", async function () {
    const Greeter = this.env.artifacts.require("Greeter");
    const greeter = await Greeter.new();

    assertIsContractInstance(greeter, "greet", "setGreeting");

    const Lib = this.env.artifacts.require("Lib");
    const lib = await Lib.new();
    assertIsContractInstance(lib, "addOne");
  });

  it("Should set a default sender to the contract's functions", async function () {
    const Greeter = this.env.artifacts.require("Greeter");
    const greeter = await Greeter.new();

    assert.equal(await greeter.greet(), "Hi");

    await greeter.setGreeting("Hi!!!");
    assert.equal(await greeter.greet(), "Hi!!!");
  });

  it("Should work with Contract.at", async function () {
    const Greeter = this.env.artifacts.require("Greeter");
    const greeter = await Greeter.new();
    const greeterWithAt = await Greeter.at(greeter.address);

    assertIsContractInstance(greeterWithAt, "greet");

    assert.equal(await greeterWithAt.greet(), "Hi");

    await greeterWithAt.setGreeting("Hi!!!");
    assert.equal(await greeterWithAt.greet(), "Hi!!!");
  });

  it("Should work with new Contract(addr)", async function () {
    const Greeter = this.env.artifacts.require("Greeter");
    const greeter = await Greeter.new();

    const greeterWithNew = new Greeter(greeter.address);

    assertIsContractInstance(greeterWithNew, "greet");

    assert.equal(await greeterWithNew.greet(), "Hi");

    await greeterWithNew.setGreeting("Hi!!!");
    assert.equal(await greeterWithNew.greet(), "Hi!!!");
  });

  it("Should provision cloned contracts", async function () {
    const Greeter = this.env.artifacts.require("Greeter");
    const ClonedGreeter = Greeter.clone();
    const greeter = await ClonedGreeter.new();

    assertIsContractInstance(greeter, "greet");

    assert.equal(await greeter.greet(), "Hi");

    await greeter.setGreeting("Hi!!!");
    assert.equal(await greeter.greet(), "Hi!!!");
  });

  it("Should fail to deploy an unlinked contract", async function () {
    const UsesLib = this.env.artifacts.require("UsesLib");

    try {
      await UsesLib.new();
      assert.fail("UsesLib shouldn't be deployeable if not linked");
    } catch (error: any) {
      assert.include(error.message, "UsesLib contains unresolved libraries");
    }
  });

  it("Should deploy linked contracts successfully", async function () {
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

describe("HardhatRuntimeEnvironment extension", function () {
  useEnvironment("hardhat-project-solc-0.5");

  it("It should add a require function to artifacts", function () {
    assert.isFunction(this.env.artifacts.require);
  });
});

describe("TruffleContracts loading and provisioning", function () {
  describe("When compiling with solc 0.5.x", function () {
    useEnvironment("hardhat-project-solc-0.5");
    testArtifactsFunctionality();
  });

  describe("When compiling with solc 0.4.x", function () {
    useEnvironment("hardhat-project-solc-0.4");
    testArtifactsFunctionality();
  });

  describe("When compiling with solc 0.6.x", function () {
    useEnvironment("hardhat-project-solc-0.6");
    testArtifactsFunctionality();
  });

  describe("Without accounts", function () {
    function shouldWorkWithoutAccounts() {
      it("Should be able to call constant functions", async function () {
        const Greeter = this.env.artifacts.require("Greeter");

        // We test it this way as actually deploying a contract here, without
        // accounts, is difficult.
        const greeterWithAt = new Greeter(
          "0x0000000000000000000000000000000000000001"
        );

        // Shouldn't throw.
        await greeterWithAt.greet.estimateGas();
      });
    }

    describe("With solc 0.4.x", function () {
      useEnvironment("hardhat-project-solc-0.4", "withoutAccounts");
      shouldWorkWithoutAccounts();
    });

    describe("With solc 0.5.x", function () {
      useEnvironment("hardhat-project-solc-0.5", "withoutAccounts");
      shouldWorkWithoutAccounts();
    });

    describe("With solc 0.6.x", function () {
      useEnvironment("hardhat-project-solc-0.6", "withoutAccounts");
      shouldWorkWithoutAccounts();
    });
  });
});

describe("Test contracts compilation", function () {
  useEnvironment("hardhat-project-with-test-contracts");

  it("Should include sources from sources", async function () {
    const sources = await this.env.run(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS);

    assert.include(
      sources,
      fs.realpathSync(
        path.join(process.cwd(), "contracts", "fromContracts.sol")
      )
    );
  });

  it("Should include sources from test", async function () {
    const sources = await this.env.run(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS);

    assert.include(
      sources,
      fs.realpathSync(path.join(process.cwd(), "test", "fromTest.sol"))
    );
  });

  it("Should ignore non-source files from test", async function () {
    const sources = await this.env.run(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS);

    assert.notInclude(
      sources,
      fs.realpathSync(path.join(process.cwd(), "test", "shouldBeIgnored.txt"))
    );
  });

  it("Should include all the files from contracts and test", async function () {
    const sources = await this.env.run(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS);

    assert.lengthOf(sources, 2);
  });
});

describe("Gas multiplier", function () {
  async function assertItWorksForDeployments(
    env: HardhatRuntimeEnvironment,
    multiplier: number
  ) {
    const Greeter = env.artifacts.require("Greeter");

    const accounts = await env.web3.eth.getAccounts();
    const web3Estimation = await env.web3.eth.estimateGas({
      from: accounts[0],
      data: Greeter.bytecode,
    });

    const greeter = await Greeter.new();
    const tx = await env.web3.eth.getTransaction(greeter.transactionHash);

    const gasLimit = tx.gas;

    assert.equal(gasLimit, Math.floor(web3Estimation * multiplier));
  }

  async function assertItWorksForFunctions(
    env: HardhatRuntimeEnvironment,
    multiplier: number
  ) {
    const Greeter = env.artifacts.require("Greeter");
    const greeter = await Greeter.new();

    const greeting = "Hello, Truffle";
    const callData = env.web3.eth.abi.encodeFunctionCall(
      {
        name: "setGreeting",
        type: "function",
        inputs: [
          {
            type: "string",
            name: "_greeting",
          },
        ],
      },
      [greeting]
    );

    const accounts = await env.web3.eth.getAccounts();
    const web3Estimation = await env.web3.eth.estimateGas({
      to: greeter.address,
      from: accounts[0],
      data: callData,
    });

    const txResult = await greeter.setGreeting(greeting);
    const tx = await env.web3.eth.getTransaction(txResult.tx);

    const gasLimit = tx.gas;
    assert.equal(gasLimit, Math.floor(web3Estimation * multiplier));
  }

  describe("When it's set in the network", function () {
    useEnvironment("hardhat-project-solc-0.4", "withGasMultiplier");

    it("Should use the set one for deployments", async function () {
      const multiplier = this.env.network.config.gasMultiplier!;
      await assertItWorksForDeployments(this.env, multiplier);
    });

    it("Should use the set one for functions", async function () {
      const multiplier = this.env.network.config.gasMultiplier!;
      await assertItWorksForFunctions(this.env, multiplier);
    });
  });

  describe("When it's not set in the network", function () {
    useEnvironment("hardhat-project-solc-0.4");

    it("Should use the set one for deployments", async function () {
      await assertItWorksForDeployments(this.env, DEFAULT_GAS_MULTIPLIER);
    });

    it("Should use the set one for functions", async function () {
      await assertItWorksForFunctions(this.env, DEFAULT_GAS_MULTIPLIER);
    });
  });
});

describe("Contract function's accounts derivation", function () {
  useEnvironment("hardhat-project-with-accounts", "hardhat");
  it("Should derive the right accounts for hardhat network when contract is used in a test", async function () {
    // We run a test in the fixture project that validates this
    const result = await this.env.run("test");
    assert.equal(result, 0);
    process.exitCode = 0;
  });
});

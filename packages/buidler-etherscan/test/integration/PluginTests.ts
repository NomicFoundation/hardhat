import { TASK_FLATTEN_GET_FLATTENED_SOURCE } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";
import { assert } from "chai";
import { ethers } from "ethers";
// @ts-ignore
import * as linker from "solc/linker";

import ContractCompiler from "../../src/ContractCompiler";
import deployer from "../util/ContractDeployer";

declare module "mocha" {
  interface Context {
    env: BuidlerRuntimeEnvironment;
  }
}

describe("Plugin integration tests", function() {
  this.timeout(100000);

  let env: BuidlerRuntimeEnvironment;

  before("Buidler project setup", function() {
    process.chdir(__dirname + "/../buidler-project");
    process.env.BUIDLER_NETWORK = "develop";
    env = require("@nomiclabs/buidler");
  });

  it("Test verifying deployed contract on etherscan", async () => {
    let flattenedSource: string = await env.run(
      TASK_FLATTEN_GET_FLATTENED_SOURCE
    );

    // need non repeating message so it makes bytecode unique
    const message = ethers.Wallet.createRandom().address;
    flattenedSource = flattenedSource.replace("placeholder", message);
    const compilationResult = await new ContractCompiler(env.run).compile(
      flattenedSource,
      "TestContract1"
    );
    compilationResult.bytecode = linker.linkBytecode(
      compilationResult.bytecode,
      {
        "contracts:SafeMath": "0x292FFB096f7221c0C879c21535058860CcA67f58"
      }
    );
    const amount = "20";
    const deployedAddress = await deployer.deployContract(
      compilationResult.abi,
      "0x" + compilationResult.bytecode,
      amount
    );
    try {
      await env.run("verify-contract", {
        address: deployedAddress,
        contractName: "TestContract1",
        // libraries: JSON.stringify({
        //   "SafeMath": "0x292FFB096f7221c0C879c21535058860CcA67f58"
        // }),
        source: flattenedSource,
        constructorArguments: [amount]
      });
      assert.isTrue(true);
    } catch (e) {
      console.log(e);
      assert.fail();
    }
    return true;
  });
});

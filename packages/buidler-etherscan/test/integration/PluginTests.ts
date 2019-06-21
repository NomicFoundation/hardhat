import { TASK_FLATTEN_GET_FLATTENED_SOURCE } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { assert } from "chai";
import { ethers } from "ethers";
// @ts-ignore
import * as linker from "solc/linker";

import ContractCompiler from "../../src/ContractCompiler";
import { useEnvironment } from "../helpers";
import deployer from "../util/ContractDeployer";

describe("Plugin integration tests", function() {
  this.timeout(100000);

  useEnvironment(__dirname + "/../buidler-project");

  it("Test verifying deployed contract on etherscan", async function() {
    // function getRandomString(): string {
    //   return
    // }
    const flattenedSource: string = (await this.env.run(
      TASK_FLATTEN_GET_FLATTENED_SOURCE
    )).replace("placeholder", ethers.Wallet.createRandom().address);

    const compilationResult = await new ContractCompiler(this.env.run).compile(
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
      await this.env.run("verify-contract", {
        address: deployedAddress,
        contractName: "TestContract1",
        // See: https://github.com/nomiclabs/buidler-etherscan/pull/2#discussion_r270282941
        // libraries: JSON.stringify({
        //   "SafeMath": "0x292FFB096f7221c0C879c21535058860CcA67f58"
        // }),
        source: flattenedSource,
        constructorArguments: [amount]
      });

      assert.isTrue(true);
    } catch (error) {
      console.log(error);
      assert.fail(error.message);
    }

    return true;
  });
});

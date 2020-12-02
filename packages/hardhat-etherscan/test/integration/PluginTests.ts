import { assert } from "chai";
import {
  TASK_COMPILE,
  TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT,
} from "hardhat/builtin-tasks/task-names";
import type { task as taskT } from "hardhat/config";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import type { CompilerInput } from "hardhat/types";
import path from "path";

import { TASK_VERIFY_GET_MINIMUM_BUILD } from "../../src/pluginContext";
import { useEnvironment } from "../helpers";

// These are skipped because they can't currently be run in CI
describe("Plugin integration tests", function () {
  this.timeout(1000000);
  this.beforeAll(function () {
    if (process.env.RUN_ETHERSCAN_TESTS !== "yes") {
      this.skip();
    } else {
      if (
        process.env.WALLET_PRIVATE_KEY === undefined ||
        process.env.WALLET_PRIVATE_KEY === ""
      ) {
        throw new Error("missing WALLET_PRIVATE_KEY env variable");
      }
    }
  });

  describe("Using a normal Hardhat project", function () {
    useEnvironment("hardhat-project", "testnet");

    this.beforeEach(function () {
      const mutation = getRandomString(this.env);
      const { task }: { task: typeof taskT } = require("hardhat/config");

      // We replace placeholder strings in the compilation pipeline.
      // We need to override the task here since the Hardhat context
      // is only created just in time for the test. See useEnvironment in the helpers module.
      task(TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT).setAction(
        async (_, hre, runSuper) => {
          const solcInput: CompilerInput = await runSuper();
          for (const source of Object.values(solcInput.sources)) {
            source.content = source.content.replace("placeholder", mutation);
          }
          return solcInput;
        }
      );
    });

    it("Should verify deployed inner contract on etherscan", async function () {
      await this.env.run(TASK_COMPILE, { force: true });

      const deployedAddress = await deployContract(
        "InnerContract",
        [],
        this.env
      );

      return this.env.run("verify", {
        address: deployedAddress,
        constructorArguments: [],
      });
    });

    it("Should verify deployed contract with name clash on etherscan", async function () {
      await this.env.run(TASK_COMPILE, { force: true });

      const deployedAddress = await deployContract(
        "TestReentrancyGuardLocal",
        [],
        this.env
      );

      return this.env.run("verify", {
        address: deployedAddress,
        constructorArguments: [],
      });
    });

    it("Should verify deployed library on etherscan", async function () {
      await this.env.run(TASK_COMPILE, { force: true });

      const deployedAddress = await deployContract("TestLibrary", [], this.env);

      return this.env.run("verify", {
        address: deployedAddress,
        constructorArguments: [],
      });
    });

    // The plugin doesn't look at deployment bytecode while inferring the contract
    it("fail when the contract can only be singled out by its deploy bytecode", async function () {
      await this.env.run(TASK_COMPILE, { force: true });

      const amount = "20";

      // We wait a single block because we just want the contract code to be available
      // at the Ethereum node we're connected to.
      const deployedAddress = await deployContract(
        "TestContract1",
        [amount],
        this.env,
        1
      );

      return this.env
        .run("verify", {
          address: deployedAddress,
          constructorArguments: [amount],
        })
        .catch((reason) => {
          assert.instanceOf(
            reason,
            NomicLabsHardhatPluginError,
            "Ambiguous inferences should throw an error"
          );

          assert.isTrue(
            reason.message.includes(
              "use the contract parameter with one of the following contracts"
            ),
            "The error should contain an explanation of how to solve the ambiguous inference."
          );
          assert.isTrue(
            reason.message.includes(
              "contracts/TestContract1.sol:TestContract1"
            ),
            "The deployed contract should be among the presented options."
          );
        });
    });

    it("Should verify deployed contract with a complex parameter list on etherscan", async function () {
      await this.env.run(TASK_COMPILE, { force: true });

      const modulePath = path.join(process.cwd(), "paramList");
      const args = require(modulePath);
      const deployedAddress = await deployContract(
        "TestParamList",
        args,
        this.env
      );

      return this.env.run("verify", {
        address: deployedAddress,
        constructorArgs: modulePath,
      });
    });

    describe("With contract fully qualified name parameter", function () {
      it("Should fail to verify contract with a different version", async function () {
        await this.env.run(TASK_COMPILE, { force: true });

        const deployedAddress = await deployContract(
          "NewContract",
          [],
          this.env,
          1
        );

        return this.env
          .run("verify", {
            address: deployedAddress,
            constructorArguments: [],
            contract: "contracts/TestContract1.sol:InnerContract",
          })
          .catch((reason) => {
            assert.instanceOf(
              reason,
              NomicLabsHardhatPluginError,
              "Ambiguous inferences should throw an error"
            );

            assert.isTrue(
              reason.message.includes(
                "the contract found in the address provided as argument has its bytecode marked with"
              ),
              "The error should describe the version found in the bytecode metadata."
            );
            assert.isTrue(
              reason.message.includes("0.7.5"),
              "The version inferred from the bytecode should be shown."
            );
          });
      });

      it("should verify when passing the correct fully qualified name", async function () {
        await this.env.run(TASK_COMPILE, { force: true });

        const amount = "20";

        const deployedAddress = await deployContract(
          "TestContract1",
          [amount],
          this.env
        );

        return this.env.run("verify", {
          address: deployedAddress,
          constructorArguments: [amount],
          contract: "contracts/TestContract1.sol:TestContract1",
        });
      });
    });
  });
});

function getRandomString({ ethers }: any): string {
  return ethers.Wallet.createRandom().address;
}

async function deployContract(
  contractName: string,
  constructorArguments: string[],
  { ethers }: any,
  confirmations: number = 5,
  signer?: any
) {
  if (signer === undefined) {
    signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, ethers.provider);
  }

  const factory = await ethers.getContractFactory(contractName, signer);
  const contract = await factory.deploy(...constructorArguments);
  await contract.deployTransaction.wait(confirmations);
  return contract.address;
}

describe("Plugin subtask test", function () {
  describe("Using a normal Hardhat project", function () {
    useEnvironment("hardhat-project-only-contracts");

    it("Minimum build subtask should work with simple project", async function () {
      const sourceName = "contracts/TestContract.sol";
      const build = await this.env.run(TASK_VERIFY_GET_MINIMUM_BUILD, {
        sourceName,
      });

      assert.hasAnyKeys(build.input.sources, [sourceName]);
      assert.hasAnyKeys(build.output.sources, [sourceName]);

      assert.doesNotHaveAnyKeys(build.output.sources, [
        "contracts/ReentrancyGuard.sol",
      ]);
    });
  });
});

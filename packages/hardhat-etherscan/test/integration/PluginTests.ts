import { assert, expect } from "chai";
import {
  TASK_COMPILE,
  TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT,
} from "hardhat/builtin-tasks/task-names";
import type { task as taskT } from "hardhat/config";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import type { CompilerInput } from "hardhat/types";
// tslint:disable-next-line: no-implicit-dependencies
import nock from "nock";
import path from "path";

import { TASK_VERIFY_GET_MINIMUM_BUILD } from "../../src/constants";
import { useEnvironment } from "../helpers";

// These are skipped because they can't currently be run in CI
describe("Plugin integration tests", function () {
  describe("Using a normal Hardhat project", function () {
    this.timeout(1000000);

    before(function () {
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
    useEnvironment("hardhat-project", "testnet");

    beforeEach(async function () {
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

      // We force compilation to make sure that Hardhat introduces a new random payload.
      await this.env.run(TASK_COMPILE, { force: true });
    });

    it("Should verify deployed inner contract on etherscan", async function () {
      const deployedAddress = await deployContract(
        "InnerContract",
        [],
        this.env
      );

      return this.env.run("verify", {
        address: deployedAddress,
      });
    });

    it("Should verify deployed contract with name clash on etherscan", async function () {
      const deployedAddress = await deployContract(
        "TestReentrancyGuardLocal",
        [],
        this.env
      );

      return this.env.run("verify", {
        address: deployedAddress,
      });
    });

    it("Should verify deployed library on etherscan", async function () {
      const deployedAddress = await deployContract("TestLibrary", [], this.env);

      return this.env.run("verify", {
        address: deployedAddress,
      });
    });

    it("Should verify deployed contract with a complex parameter list on etherscan", async function () {
      const modulePath = path.join(process.cwd(), "paramList.js");
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
      it("should verify when passing the correct fully qualified name", async function () {
        const amount = "20";

        const deployedAddress = await deployContract(
          "TestContract1",
          [amount],
          this.env
        );

        return this.env.run("verify", {
          address: deployedAddress,
          constructorArgsParams: [amount],
          contract: "contracts/TestContract1.sol:TestContract1",
        });
      });
    });
  });

  describe("Using a Hardhat project that mocks the rinkeby network", function () {
    useEnvironment("hardhat-project-rinkeby-mock");

    let signer: any;

    // This environment variable allows us to avoid the network name check for this mock environment.
    before(function () {
      process.env.HARDHAT_ETHERSCAN_MOCK_NETWORK_TESTS = "yes";
    });

    after(function () {
      process.env.HARDHAT_ETHERSCAN_MOCK_NETWORK_TESTS = "no";
    });

    beforeEach(async function () {
      // We ensure that the compile task was run at least once before disallowing net connections.
      // This avoids failure due to compiler downloads.
      await this.env.run(TASK_COMPILE, { quiet: true });
      nock.disableNetConnect();
      const { ethers } = this.env as any;
      const signers = await ethers.getSigners();
      signer = signers[0];
    });

    afterEach(function () {
      nock.enableNetConnect();
    });

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

    it("fail when the deployed bytecode matches with more than one contract in the project", async function () {
      const amount = "20";

      const deployedAddress = await deployContract(
        "TestContract1",
        [amount],
        this.env,
        1,
        signer
      );

      return this.env
        .run("verify", {
          address: deployedAddress,
          constructorArgsParams: [amount],
        })
        .then(() => {
          assert.fail("The plugin should throw an error");
        })
        .catch((reason) => {
          expect(reason).to.be.an.instanceOf(
            NomicLabsHardhatPluginError,
            "Ambiguous inferences should throw a plugin error"
          );

          expect(reason.message)
            .to.be.a("string")
            .and.include(
              "use the contract parameter with one of the following contracts",
              "The error should contain an explanation of how to solve the ambiguous inference."
            )
            .and.include(
              "contracts/TestContract1.sol:TestContract1",
              "The deployed contract should be among the presented options."
            );
        });
    });

    it("fail when the verify subtask receives an invalid list of constructor arguments", async function () {
      const constructorArguments: any[] = [];

      const deployedAddress = await deployContract(
        "InnerContract",
        constructorArguments,
        this.env,
        1,
        signer
      );

      return this.env
        .run("verify:verify", {
          address: deployedAddress,
          constructorArguments: null,
        })
        .then(() => {
          assert.fail(
            "The verify subtask should throw an error when passed a null constructor arguments list."
          );
        })
        .catch((reason) => {
          expect(reason).to.be.an.instanceOf(
            NomicLabsHardhatPluginError,
            "An invalid list of constructor arguments should cause a Hardhat plugin error"
          );

          expect(reason.message)
            .to.be.a("string")
            .and.include(
              "The constructorArguments parameter should be an array",
              "The error message should communicate the type error."
            );
        });
    });

    describe("With contract fully qualified name parameter", function () {
      it("Should fail to verify contract with a different version", async function () {
        const deployedAddress = await deployContract(
          "NewContract",
          [],
          this.env,
          1,
          signer
        );

        return this.env
          .run("verify", {
            address: deployedAddress,
            constructorArgsParams: [],
            contract: "contracts/TestContract1.sol:InnerContract",
          })
          .then(() =>
            assert.fail(
              "The verify task should fail when the deployed bytecode is marked with an unexpected compiler version."
            )
          )
          .catch((reason) => {
            expect(reason).to.be.an.instanceOf(
              NomicLabsHardhatPluginError,
              "The verify task should throw a plugin error when there is a version mismatch between the deployed bytecode and compiler used for a particular contract"
            );

            expect(reason.message)
              .to.be.a("string")
              .and.include(
                "the contract found in the address provided as argument has its bytecode marked with",
                "The error should describe the version found in the bytecode metadata."
              )
              .and.include(
                "0.7.5",
                "The version inferred from the bytecode should be shown."
              );
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
  constructorArguments: any[],
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

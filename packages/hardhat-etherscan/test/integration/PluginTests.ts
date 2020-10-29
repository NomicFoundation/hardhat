import { assert } from "chai";
import { readFileSync, writeFileSync } from "fs";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import path from "path";

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

    let placeholder: string;
    this.beforeEach(function () {
      placeholder = getRandomString(this.env);
      modifyContract(placeholder);
    });

    this.afterEach(() => restoreContract(placeholder));

    it("Should verify deployed inner contract on etherscan", async function () {
      await this.env.run(TASK_COMPILE, { force: false });

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
      await this.env.run(TASK_COMPILE, { force: false });

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
      await this.env.run(TASK_COMPILE, { force: false });

      const deployedAddress = await deployContract("TestLibrary", [], this.env);

      return this.env.run("verify", {
        address: deployedAddress,
        constructorArguments: [],
      });
    });

    // The plugin doesn't look at deployment bytecode while inferring the contract
    it("fail when the contract can only be singled out by its deploy bytecode", async function () {
      await this.env.run(TASK_COMPILE, { force: false });

      const amount = "20";

      const deployedAddress = await deployContract(
        "TestContract1",
        [amount],
        this.env
      );

      return this.env
        .run("verify", {
          address: deployedAddress,
          constructorArguments: [amount],
        })
        .catch((reason) => {
          console.log(reason);
          assert.instanceOf(
            reason,
            NomicLabsHardhatPluginError,
            "Ambiguous inferences need to be reported since they are not handled well yet"
          );
        });
    });

    it("Should verify deployed contract with a complex parameter list on etherscan", async function () {
      await this.env.run(TASK_COMPILE, { force: false });

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
  });
});

const testContractPath = path.join(
  __dirname,
  "..",
  "fixture-projects",
  "hardhat-project",
  "contracts",
  "TestContract1.sol"
);

function modifyContract(placeholder: string) {
  const data = readFileSync(testContractPath, "utf-8");

  const newData = data.replace("placeholder", placeholder);

  writeFileSync(testContractPath, newData, "utf-8");
}

function restoreContract(placeholder: string) {
  const data = readFileSync(testContractPath, "utf-8");

  const newData = data.replace(placeholder, "placeholder");

  writeFileSync(testContractPath, newData, "utf-8");
}

function getRandomString({ ethers }: any): string {
  return ethers.Wallet.createRandom().address;
}

async function deployContract(
  contractName: string,
  constructorArguments: string[],
  { ethers }: any
) {
  const wallet = new ethers.Wallet(
    process.env.WALLET_PRIVATE_KEY,
    ethers.provider
  );

  const factory = await ethers.getContractFactory(contractName, wallet);
  const contract = await factory.deploy(...constructorArguments);
  await contract.deployTransaction.wait(5);
  return contract.address;
}

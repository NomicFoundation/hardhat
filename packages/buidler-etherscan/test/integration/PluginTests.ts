import { TASK_COMPILE } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { BuidlerPluginError, readArtifact } from "@nomiclabs/buidler/plugins";
import { assert } from "chai";
// tslint:disable: no-implicit-dependencies
import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

import { useEnvironment } from "../helpers";

async function delay(timeout: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

// These are skipped because they can't currently be run in CI
describe.skip("Plugin integration tests", function() {
  this.timeout(1000000);

  const DEPLOY_SLEEP_TIME = 10000;

  describe("Using a correct Buidler project", () => {
    useEnvironment(path.join(__dirname, "..", "buidler-project"));

    let placeholder: string;
    this.beforeEach(() => {
      placeholder = getRandomString();
      modifyContract(placeholder);
    });

    this.afterEach(() => restoreContract(placeholder));

    it("Test verifying deployed contract on etherscan", async function() {
      await this.env.run(TASK_COMPILE, { force: false });

      const { bytecode, abi } = await readArtifact(
        this.env.config.paths.artifacts,
        "TestContract1"
      );
      const amount = "20";

      const deployedAddress = await deployContract(abi, `${bytecode}`, [
        amount
      ]);

      // Sleep for a while to avoid Etherscan API race condition on last deployed contract
      await delay(DEPLOY_SLEEP_TIME);

      try {
        await this.env.run("verify-contract", {
          address: deployedAddress,
          libraries: JSON.stringify({
            // SafeMath: "0x292FFB096f7221c0C879c21535058860CcA67f58"
          }),
          constructorArguments: [amount]
        });

        assert.isTrue(true);
      } catch (error) {
        assert.fail(error.message);
      }

      return true;
    });

    it("Should verify deployed inner contract on etherscan", async function() {
      await this.env.run(TASK_COMPILE, { force: false });

      const { bytecode, abi } = await readArtifact(
        this.env.config.paths.artifacts,
        "InnerContract"
      );

      const deployedAddress = await deployContract(abi, `${bytecode}`, []);

      // Sleep for a while to avoid Etherscan API race condition on last deployed contract
      await delay(DEPLOY_SLEEP_TIME);

      try {
        await this.env.run("verify-contract", {
          address: deployedAddress,
          libraries: JSON.stringify({}),
          constructorArguments: []
        });

        assert.isTrue(true);
      } catch (error) {
        assert.fail(error.message);
      }

      return true;
    });

    it("Should verify deployed contract with name clash on etherscan", async function() {
      await this.env.run(TASK_COMPILE, { force: false });

      const { bytecode, abi } = await readArtifact(
        this.env.config.paths.artifacts,
        "TestReentrancyGuardLocal"
      );
      const deployedAddress = await deployContract(abi, `${bytecode}`, []);

      // Sleep for a while to avoid Etherscan API race condition on last deployed contract
      await delay(DEPLOY_SLEEP_TIME);

      try {
        await this.env.run("verify-contract", {
          address: deployedAddress,
          libraries: JSON.stringify({}),
          constructorArguments: []
        });

        assert.isTrue(true);
      } catch (error) {
        assert.fail(error.message);
      }
    });
  });

  describe("Using a Buidler project with circular dependencies", () => {
    useEnvironment(path.join(__dirname, "..", "buidler-project-circular-dep"));
    it("Fails with an error message indicating to use Etherscan's GUI", async function() {
      this.env
        .run("verify-contract", {
          address: "0x0",
          contractName: "TestContract",
          constructorArguments: []
        })
        .catch((e: any) => assert.instanceOf(e, BuidlerPluginError));
    });
  });
});

const testContractPath = path.join(
  __dirname,
  "../buidler-project/contracts/TestContract1.sol"
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

function getRandomString(): string {
  return ethers.Wallet.createRandom().address;
}

async function deployContract(
  abi: any[],
  bytecode: string,
  constructorArguments: string[]
) {
  const provider = ethers.getDefaultProvider("ropsten");

  if (
    process.env.WALLET_PRIVATE_KEY === undefined ||
    process.env.WALLET_PRIVATE_KEY === ""
  ) {
    throw new Error("missing WALLET_PRIVATE_KEY env variable");
  }

  const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(...constructorArguments);
  await contract.deployed();
  await contract.deployTransaction.wait(3);
  return contract.address;
}

import path from "path";
import { resetHardhatContext } from "hardhat/plugins-testing";

import type {} from "@nomiclabs/hardhat-ethers";
import { FactoryOptions, HardhatRuntimeEnvironment } from "hardhat/types";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
  }
}

export const useEnvironment = (
  fixtureProjectName: string,
  networkName = "hardhat"
): void => {
  const currentDir = __dirname;
  before("Loading hardhat environment", function () {
    process.chdir(
      path.join(currentDir, "fixture-projects", fixtureProjectName)
    );
    process.env.HARDHAT_NETWORK = networkName;

    this.hre = require("hardhat");
  });

  after("Resetting hardhat context", async function () {
    process.chdir(path.resolve(`${__dirname}/..`));
    resetHardhatContext();
    delete process.env.HARDHAT_NETWORK;
  });
};

export const deployContract = async (
  contractName: string,
  constructorArguments: any[],
  { ethers }: HardhatRuntimeEnvironment,
  confirmations: number = 5,
  options: FactoryOptions = {}
): Promise<string> => {
  if (options.signer === undefined) {
    if (process.env.WALLET_PRIVATE_KEY === undefined) {
      throw new Error("No wallet or signer defined for deployment.");
    }
    options.signer = new ethers.Wallet(
      process.env.WALLET_PRIVATE_KEY,
      ethers.provider
    );
  }

  const factory = await ethers.getContractFactory(contractName, options);
  const contract = await factory.deploy(...constructorArguments);
  await contract.deployTransaction.wait(confirmations);
  return contract.address;
};

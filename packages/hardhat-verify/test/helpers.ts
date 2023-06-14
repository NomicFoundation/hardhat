import path from "path";
import { resetHardhatContext } from "hardhat/plugins-testing";

import type {} from "@nomicfoundation/hardhat-ethers";
import { FactoryOptions, HardhatRuntimeEnvironment } from "hardhat/types";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
  }
}

export const useEnvironment = (fixtureProjectName: string): void => {
  before("Loading hardhat environment", function () {
    process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName));
    process.env.HARDHAT_NETWORK = "hardhat";

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
  confirmations: number = 1,
  options: FactoryOptions = {}
): Promise<string> => {
  const factory = await ethers.getContractFactory(contractName, options);
  const contract = await factory.deploy(...constructorArguments);
  await contract.deploymentTransaction()?.wait(confirmations);
  const contractAddress = await contract.getAddress();
  console.log(`Deployed ${contractName} at ${contractAddress}`);
  return contractAddress;
};

export const getRandomAddress = (hre: HardhatRuntimeEnvironment): string =>
  hre.ethers.Wallet.createRandom().address;

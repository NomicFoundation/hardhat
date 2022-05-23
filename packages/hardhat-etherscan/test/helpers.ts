import type {} from "@nomiclabs/hardhat-ethers";

import { resetHardhatContext } from "hardhat/plugins-testing";
import { FactoryOptions, HardhatRuntimeEnvironment } from "hardhat/types";
import path from 'node:path';

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function useEnvironment(
  fixtureProjectName: string,
  networkName = "hardhat"
) {
  beforeEach("Loading hardhat environment", function () {
    process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName));
    process.env.HARDHAT_NETWORK = networkName;

    this.env = require("hardhat");
  });

  afterEach("Resetting hardhat", function () {
    resetHardhatContext();
  });
}

export async function deployContract(
  contractName: string,
  constructorArguments: any[],
  { ethers }: HardhatRuntimeEnvironment,
  confirmations: number = 5,
  options: FactoryOptions = {}
): Promise<string> {
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
}

export function getRandomString({ ethers }: HardhatRuntimeEnvironment): string {
  return ethers.Wallet.createRandom().address;
}

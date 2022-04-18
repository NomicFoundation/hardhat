import { BN, toBuffer } from "ethereumjs-util";
import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
  }
}

export function useEnvironment(
  fixtureProjectName: string,
  networkName = "hardhat"
) {
  beforeEach("Loading hardhat environment", function () {
    process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName));
    process.env.HARDHAT_NETWORK = networkName;

    this.hre = require("hardhat");
  });

  afterEach("Resetting hardhat", function () {
    resetHardhatContext();
  });
}

export function rpcQuantityToNumber(quantity: string): number {
  const buffer = toBuffer(quantity);
  return new BN(buffer).toNumber();
}

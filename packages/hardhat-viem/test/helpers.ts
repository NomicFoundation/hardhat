import type { HardhatRuntimeEnvironment } from "hardhat/types";

import path from "path";
import { resetHardhatContext } from "hardhat/plugins-testing";

// Import this plugin type extensions for the HardhatRuntimeEnvironment
import "../src/internal/type-extensions";

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

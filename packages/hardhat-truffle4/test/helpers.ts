import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from 'node:path';

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function useEnvironment(
  fixtureProjectName: string,
  networkName = "localhost"
) {
  beforeEach("Loading hardhat environment", function () {
    process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName));
    process.env.HARDHAT_NETWORK = networkName;

    this.env = require("hardhat");
  });

  beforeEach("Loading hardhat environment", async function () {
    await this.env.run("compile", { quiet: true });
  });

  afterEach("Resetting hardhat", function () {
    resetHardhatContext();
    delete process.env.HARDHAT_NETWORK;
  });
}

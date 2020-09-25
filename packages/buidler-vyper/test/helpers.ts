import fsExtra from "fs-extra";
import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function useEnvironment(projectPath: string) {
  beforeEach("Loading hardhat environment", async function () {
    process.chdir(projectPath);

    await fsExtra.remove("cache");
    await fsExtra.remove("artifacts");

    process.env.HARDHAT_NETWORK = "localhost";

    this.env = require("hardhat");
  });

  afterEach("Resetting hardhat", function () {
    resetHardhatContext();
  });
}

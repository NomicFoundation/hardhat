import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function resetHardhat() {
  // TODO#plugins-refactor: These shouldn't be necessary
  delete require.cache[require.resolve("../src/index")];

  resetHardhatContext();
}

export function useEnvironment(
  projectPath: string,
  network: string = "hardhat"
) {
  beforeEach("Loading hardhat environment", function () {
    process.chdir(projectPath);
    process.env.HARDHAT_NETWORK = network;

    this.env = require("hardhat");
  });

  afterEach("Resetting hardhat", function () {
    resetHardhat();
  });
}

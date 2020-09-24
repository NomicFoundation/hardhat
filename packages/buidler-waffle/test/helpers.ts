import { resetBuidlerContext } from "@nomiclabs/buidler/plugins-testing";
import { HardhatRuntimeEnvironment } from "@nomiclabs/buidler/types";

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function useEnvironment(projectPath: string, networkName = "hardhat") {
  beforeEach("Loading buidler environment", function () {
    process.chdir(projectPath);
    process.env.HARDHAT_NETWORK = networkName;

    this.env = require("@nomiclabs/buidler");
  });

  afterEach("Resetting buidler", function () {
    resetBuidlerContext();
    delete process.env.HARDHAT_NETWORK;
  });
}

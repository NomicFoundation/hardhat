import { resetHardhatContext } from "@nomiclabs/buidler/plugins-testing";
import { HardhatRuntimeEnvironment } from "@nomiclabs/buidler/types";

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function useEnvironment(projectPath: string, networkName = "localhost") {
  beforeEach("Loading buidler environment", function () {
    process.chdir(projectPath);
    process.env.HARDHAT_NETWORK = networkName;

    this.env = require("@nomiclabs/buidler");
  });

  beforeEach("Compile", async function () {
    await this.env.run("compile");
  });

  afterEach("Resetting buidler", function () {
    resetHardhatContext();
    delete process.env.HARDHAT_NETWORK;
  });
}

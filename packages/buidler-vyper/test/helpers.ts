import { resetHardhatContext } from "@nomiclabs/buidler/plugins-testing";
import { HardhatRuntimeEnvironment } from "@nomiclabs/buidler/types";
import fsExtra from "fs-extra";

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function useEnvironment(projectPath: string) {
  beforeEach("Loading buidler environment", async function () {
    process.chdir(projectPath);

    await fsExtra.remove("cache");
    await fsExtra.remove("artifacts");

    process.env.HARDHAT_NETWORK = "localhost";

    this.env = require("@nomiclabs/buidler");
  });

  afterEach("Resetting buidler", function () {
    resetHardhatContext();
  });
}

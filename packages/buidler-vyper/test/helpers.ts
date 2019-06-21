import { resetBuidlerContext } from "@nomiclabs/buidler/plugins-testing";
import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";
import fsExtra from "fs-extra";

declare module "mocha" {
  interface Context {
    env: BuidlerRuntimeEnvironment;
  }
}

export function useEnvironment(projectPath: string) {
  beforeEach("Loading buidler environment", async function() {
    process.chdir(projectPath);

    await fsExtra.remove("cache");
    await fsExtra.remove("artifacts");

    process.env.BUIDLER_NETWORK = "develop";

    this.env = require("@nomiclabs/buidler");
  });

  afterEach("Resetting buidler", function() {
    resetBuidlerContext();
  });
}

import { resetBuidlerContext } from "@nomiclabs/buidler/plugins-testing";
import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";

declare module "mocha" {
  interface Context {
    env: BuidlerRuntimeEnvironment;
  }
}

export function resetBuidler() {
  // TODO#plugins-refactor: These shouldn't be necessary
  delete require.cache[require.resolve("../src/index")];
  delete require.cache[require.resolve("@nomiclabs/buidler-web3")];

  resetBuidlerContext();
}

export function useEnvironment(projectPath: string, networkName = "develop") {
  beforeEach("Loading buidler environment", function() {
    process.chdir(projectPath);
    process.env.BUIDLER_NETWORK = networkName;

    this.env = require("@nomiclabs/buidler");
  });

  afterEach("Resetting buidler", function() {
    resetBuidler();
  });
}

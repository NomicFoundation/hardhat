import { resetBuidlerContext } from "@nomiclabs/buidler/plugins-testing";
import { HardhatRuntimeEnvironment } from "@nomiclabs/buidler/types";

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function resetBuidler() {
  // TODO#plugins-refactor: These shouldn't be necessary
  delete require.cache[require.resolve("../src/index")];

  resetBuidlerContext();
}

export function useEnvironment(
  projectPath: string,
  network: string = "buidlerevm"
) {
  beforeEach("Loading buidler environment", function () {
    process.chdir(projectPath);
    process.env.BUIDLER_NETWORK = network;

    this.env = require("@nomiclabs/buidler");
  });

  afterEach("Resetting buidler", function () {
    resetBuidler();
  });
}

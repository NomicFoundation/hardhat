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

  resetBuidlerContext();
}

export function useEnvironment(projectPath: string) {
  beforeEach("Loading buidler environment", function () {
    process.chdir(projectPath);
    process.env.BUIDLER_NETWORK = "localhost";

    this.env = require("@nomiclabs/buidler");
  });

  afterEach("Resetting buidler", function () {
    resetBuidler();
  });
}

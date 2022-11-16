import { resetHardhatContext } from "../../src/internal/reset";
import { HardhatRuntimeEnvironment } from "../../src/types";

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function useEnvironment(configPath?: string) {
  beforeEach("Load environment", function () {
    if (configPath !== undefined) {
      process.env.HARDHAT_CONFIG = configPath;
    }
    this.env = require("../../src/internal/lib/hardhat-lib");
  });

  afterEach("reset hardhat context", function () {
    delete process.env.HARDHAT_CONFIG;
    resetHardhatContext();
  });
}

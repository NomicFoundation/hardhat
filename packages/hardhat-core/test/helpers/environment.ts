import { resetHardhatContext } from "../../src/internal/reset";
import { HardhatRuntimeEnvironment } from "../../src/types";

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function useEnvironment() {
  beforeEach("Load environment", function () {
    this.env = require("../../src/internal/lib/hardhat-lib");
  });

  afterEach("reset hardhat context", function () {
    resetHardhatContext();
  });
}

import { resetBuidlerContext } from "../../src/internal/reset";
import { BuidlerRuntimeEnvironment } from "../../src/types";

declare module "mocha" {
  interface Context {
    env: BuidlerRuntimeEnvironment;
  }
}

export function useEnvironment() {
  beforeEach("Load environment", function() {
    this.env = require("../../src/internal/lib/buidler-lib");
  });

  afterEach("reset buidler context", function() {
    resetBuidlerContext();
  });
}

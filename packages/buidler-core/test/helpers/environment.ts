import { Environment } from "../../src/internal/core/runtime-environment";
import { resetBuidlerContext } from "../../src/internal/reset";

declare module "mocha" {
  interface Context {
    env: Environment;
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

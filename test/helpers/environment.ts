import { Environment } from "../../src/internal/core/runtime-environment";

declare module "mocha" {
  interface Context {
    env: Environment;
  }
}

export function useEnvironment() {
  beforeEach("Load environment", function() {
    this.env = require("../../src/internal/lib/buidler-lib");
  });

  afterEach("Unload environment", function() {
    delete require.cache[require.resolve("../../src/internal/lib/buidler-lib")];
  });
}

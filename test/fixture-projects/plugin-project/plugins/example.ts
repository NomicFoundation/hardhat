import { extendEnvironment } from "../../../../src/core/config/config-env";

declare module "../../../../src/core/runtime-environment" {
  interface BuidlerRuntimeEnvironment {
    __test_key: string;
    __test_bleep: (x: number) => number;
  }
}

extendEnvironment(env => {
  env.__test_key = "a value";
  env.__test_bleep = (x: number) => x * 2;
});

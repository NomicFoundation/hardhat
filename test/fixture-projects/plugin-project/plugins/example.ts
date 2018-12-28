import { extendEnvironment } from "../../../../src/core/config/config-env";

export interface BuidlerRuntimeEnvironment {
  key: string;
  bleep: (x: number) => number;
}

extendEnvironment((env: BuidlerRuntimeEnvironment) => {
  return {
    key: "a value",
    bleep: (x: number) => x * 2
  };
});

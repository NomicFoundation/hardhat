import type { TypechainConfig } from "../../types.js";

export const DEFAULT_CONFIG: TypechainConfig = {
  outDir: undefined,
  alwaysGenerateOverloads: false,
  dontOverrideCompile: false,
  discriminateTypes: false,
  tsNocheck: false,
};

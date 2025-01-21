import type { TypechainConfig } from "../../types.js";

export const DEFAULT_CONFIG: TypechainConfig = {
  alwaysGenerateOverloads: false,
  dontOverrideCompile: false,
  discriminateTypes: false,
  tsNocheck: false,
};

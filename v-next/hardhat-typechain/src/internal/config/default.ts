import type { TypechainConfig } from "../../types.js";

export const DEFAULT_CONFIG: TypechainConfig = {
  outDir: undefined, // If not set, it defaults to "types" when processed by the typeChain package
  alwaysGenerateOverloads: false,
  dontOverrideCompile: false,
  discriminateTypes: false,
  tsNocheck: false,
};

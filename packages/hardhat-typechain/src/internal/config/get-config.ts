import type { TypechainConfig, TypechainUserConfig } from "../../types.js";

import { DEFAULT_CONFIG } from "./default.js";

export function getConfig(
  userConfig: TypechainUserConfig | undefined,
): TypechainConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };
}

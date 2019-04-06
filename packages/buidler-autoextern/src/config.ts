import { ResolvedBuidlerConfig } from "@nomiclabs/buidler/types";

import { AutoexternConfig } from "./types";

export const DEFAULT_CONFIG: AutoexternConfig = {
  enableForFileAnnotation: "#buidler-autoextern",
  exportableFunctionNamePattern: /^_/,
  contractNameTransformer: (name: string) => "Testable" + name,
  functionNameTransformer: (name: string) => name.substr(1)
};

export function getAutoexternConfig(
  config: ResolvedBuidlerConfig
): AutoexternConfig {
  const autoexternConfig: Partial<AutoexternConfig> =
    config.autoextern !== undefined ? config.autoextern : {};

  return {
    ...DEFAULT_CONFIG,
    ...autoexternConfig
  };
}

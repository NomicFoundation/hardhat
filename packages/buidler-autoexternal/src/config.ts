import { ResolvedBuidlerConfig } from "@nomiclabs/buidler/types";

import { AutoexternalConfig } from "./types";

export const DEFAULT_CONFIG: AutoexternalConfig = {
  enableForFileAnnotation: "#buidler-autoexternal",
  exportableFunctionNamePattern: /^_/,
  contractNameTransformer: (name: string) => "Testable" + name,
  functionNameTransformer: (name: string) => name.substr(1)
};

export function getAutoexternalConfig(
  config: ResolvedBuidlerConfig
): AutoexternalConfig {
  const autoexternalConfig: Partial<AutoexternalConfig> =
    config.autoexternal !== undefined ? config.autoexternal : {};

  return {
    ...DEFAULT_CONFIG,
    ...autoexternalConfig
  };
}

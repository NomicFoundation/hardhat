import { SolidityConfig } from "../../../types";

export function getSolcVersion(solidityConfig: SolidityConfig): string {
  if (typeof solidityConfig === "string") {
    return solidityConfig;
  }

  if ("version" in solidityConfig) {
    return solidityConfig.version;
  }

  return solidityConfig.compilers[0].version; // TODO what if the array is empty?
}

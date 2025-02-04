import { NomicLabsHardhatPluginError } from "@ignored/hardhat-vnext/plugins";

export function bigintReviver(key: string, value: any): any {
  if (typeof value === "string" && /^\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }

  if (typeof value === "number" && value > Number.MAX_SAFE_INTEGER) {
    throw new NomicLabsHardhatPluginError(
      "hardhat-ignition",
      `Parameter "${key}" exceeds maximum safe integer size. Encode the value as a string using bigint notation: \`$\{value\}n\``
    );
  }

  return value;
}

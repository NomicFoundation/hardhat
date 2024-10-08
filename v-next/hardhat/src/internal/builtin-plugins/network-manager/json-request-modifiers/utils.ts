import type { RequestArguments } from "../../../../types/providers.js";
import type {
  HttpNetworkConfig,
  NetworkConfig,
} from "@ignored/hardhat-vnext/types/config";

import { hexStringToBigInt } from "@ignored/hardhat-vnext-utils/hex";

export function isResolvedHttpNetworkConfig(
  netConfig: Partial<NetworkConfig>,
): netConfig is HttpNetworkConfig {
  return netConfig.type === "http";
}

export function rpcQuantityToNumber(quantity: string): number {
  return Number(hexStringToBigInt(quantity));
}

export function getParams<ParamsT extends any[] = any[]>(
  args: RequestArguments,
): ParamsT | [] {
  const params = args.params;

  if (params === undefined) {
    return [];
  }

  if (!Array.isArray(params)) {
    // eslint-disable-next-line no-restricted-syntax -- TODO: do we need to support this?
    throw new Error(
      "Hardhat Network doesn't support JSON-RPC params sent as an object",
    );
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO
  return params as ParamsT;
}

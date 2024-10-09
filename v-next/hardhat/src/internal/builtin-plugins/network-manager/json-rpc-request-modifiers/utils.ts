import type { RequestArguments } from "../../../../types/providers.js";
import type {
  HttpNetworkConfig,
  NetworkConfig,
} from "@ignored/hardhat-vnext/types/config";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
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
    throw new HardhatError(HardhatError.ERRORS.NETWORK.INVALID_REQUEST_PARAMS);
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- ensures `params` is typed as `ParamsT` to match the function's return type
  return params as ParamsT;
}

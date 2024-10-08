import type { JsonRpcRequest } from "../../../../../src/types/providers.js";
import type {
  GasConfig,
  HttpNetworkAccountsConfig,
  NetworkConfig,
} from "@ignored/hardhat-vnext/types/config";

export function createNetworkConfig(config?: {
  gas?: GasConfig;
  gasMultiplier?: number;
  gasPrice?: GasConfig;
  accounts?: HttpNetworkAccountsConfig;
}): NetworkConfig {
  return {
    type: "http",

    // chainId?: 1
    // chainType?: ChainType;
    // from?: string;

    gas: config?.gas ?? "auto",
    gasMultiplier: config?.gasMultiplier ?? 1,
    gasPrice: config?.gasPrice ?? "auto",

    accounts: config?.accounts ?? [],

    // HTTP network specific
    url: "",
    timeout: 60,
    httpHeaders: {},
  };
}

export function createJsonRpcRequest(
  method: string,
  params?: unknown[] | object,
): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id: 1,
    method,
    params: params ?? [],
  };
}

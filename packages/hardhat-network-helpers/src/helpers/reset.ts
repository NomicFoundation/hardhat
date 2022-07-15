import type { HardhatNetworkForkingConfig } from "hardhat/types";
import { RpcForkConfig } from "hardhat/internal/core/jsonrpc/types/input/hardhat-network";

import { getHardhatProvider } from "../utils";

type HttpHeaders = HardhatNetworkForkingConfig["httpHeaders"];

export interface ResetForkOptions {
  url: string;
  blockNumber?: number;
  httpHeaders?: HttpHeaders;
}

/**
 * Resets the Hardhat Network fork.
 */
export async function resetFork(options: ResetForkOptions): Promise<void> {
  const provider = await getHardhatProvider();

  const rpcForkConfig: RpcForkConfig = {
    jsonRpcUrl: options.url,
    blockNumber: options.blockNumber,
    httpHeaders: options.httpHeaders,
  };

  await provider.request({
    method: "hardhat_reset",
    params: [{ forking: rpcForkConfig }],
  });
}

/**
 * Resets the Hardhat Network to an empty, non-forked state.
 */
export async function resetWithoutFork(): Promise<void> {
  const provider = await getHardhatProvider();

  await provider.request({
    method: "hardhat_reset",
    params: [],
  });
}

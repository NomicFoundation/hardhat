import type {
  EIP1193Provider,
  HardhatNetworkForkingConfig,
} from "hardhat/types";
import { RpcForkConfig } from "hardhat/internal/core/jsonrpc/types/input/hardhat-network";

import { getHardhatProvider } from "../utils";

/**
 * Resets the Hardhat Network to its initial configured state.
 *
 * If you want to reset a forked network to a non-forked state, or a non-forked
 * network to a forked state, use the low-level `hardhat_reset` JSON-RPC method
 * instead.
 */
export async function reset(): Promise<void> {
  const hre = await import("hardhat");
  const provider = await getHardhatProvider();

  const forkingConfig = hre.config.networks.hardhat.forking;

  return resetInternal(provider, forkingConfig);
}

export async function resetInternal(
  provider: EIP1193Provider,
  forkingConfig: HardhatNetworkForkingConfig | undefined
) {
  if (forkingConfig === undefined || !forkingConfig.enabled) {
    await provider.request({
      method: "hardhat_reset",
      params: [],
    });
  } else {
    const rpcForkConfig: RpcForkConfig = {
      jsonRpcUrl: forkingConfig.url,
      blockNumber: forkingConfig.blockNumber,
      httpHeaders: forkingConfig.httpHeaders,
    };

    await provider.request({
      method: "hardhat_reset",
      params: [{ forking: rpcForkConfig }],
    });
  }
}

import type { NetworkHelpers, NumberLike } from "../../../types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import { toNumber } from "../../conversion.js";

export async function reset(
  networkHelpers: NetworkHelpers,
  provider: EthereumProvider,
  url?: string,
  blockNumber?: NumberLike,
): Promise<void> {
  networkHelpers.clearSnapshots();

  if (url === undefined) {
    await provider.request({ method: "hardhat_reset", params: [] });
  } else if (blockNumber === undefined) {
    await provider.request({
      method: "hardhat_reset",
      params: [{ forking: { url } }],
    });
  } else {
    await provider.request({
      method: "hardhat_reset",
      params: [{ forking: { url, blockNumber: toNumber(blockNumber) } }],
    });
  }
}

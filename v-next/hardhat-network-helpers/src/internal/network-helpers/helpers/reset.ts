import type { NumberLike } from "../../../types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import { clearSnapshots } from "../../../load-fixture.js";
import { toNumber } from "../../conversion.js";

export async function reset(
  provider: EthereumProvider,
  url?: string,
  blockNumber?: NumberLike,
): Promise<void> {
  clearSnapshots();

  if (url === undefined) {
    await provider.request({ method: "hardhat_reset", params: [] });
  } else if (blockNumber === undefined) {
    await provider.request({
      method: "hardhat_reset",
      params: [{ forking: { jsonRpcUrl: url } }],
    });
  } else {
    await provider.request({
      method: "hardhat_reset",
      params: [
        { forking: { jsonRpcUrl: url, blockNumber: toNumber(blockNumber) } },
      ],
    });
  }
}

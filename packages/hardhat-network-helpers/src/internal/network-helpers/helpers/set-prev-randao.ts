import type { NumberLike } from "../../../types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import { toPaddedRpcQuantity } from "../../padding.js";

export async function setPrevRandao(
  provider: EthereumProvider,
  prevRandao: NumberLike,
): Promise<void> {
  const paddedPrevRandao = toPaddedRpcQuantity(prevRandao, 32);

  await provider.request({
    method: "hardhat_setPrevRandao",
    params: [paddedPrevRandao],
  });
}

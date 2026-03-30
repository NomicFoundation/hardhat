import type { NumberLike } from "../../../types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import { toRpcQuantity } from "../../conversion.js";

export async function mine(
  provider: EthereumProvider,
  blocks: NumberLike = 1,
  options: { interval?: NumberLike } = { interval: 1 },
): Promise<void> {
  const blocksHex = toRpcQuantity(blocks);
  const intervalHex = toRpcQuantity(options.interval ?? 1);

  await provider.request({
    method: "hardhat_mine",
    params: [blocksHex, intervalHex],
  });
}

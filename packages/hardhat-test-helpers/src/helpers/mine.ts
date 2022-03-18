import { NumberLike } from "../types";
import { getHardhatProvider, toRpcQuantity } from "../utils";

export async function mine(
  blocks: NumberLike = 1,
  options: { interval?: NumberLike } = {}
): Promise<void> {
  const provider = await getHardhatProvider();

  const interval = options.interval ?? 1;

  const blocksHex = toRpcQuantity(blocks);
  const intervalHex = toRpcQuantity(interval);

  await provider.request({
    method: "hardhat_mine",
    params: [blocksHex, intervalHex],
  });
}

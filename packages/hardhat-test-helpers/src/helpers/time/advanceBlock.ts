import type { NumberLike } from "../../types";

import {
  getHardhatProvider,
  assertPositiveNumber,
  toRpcQuantity,
  toBigInt,
} from "../../utils";

import { latestBlock } from "./latestBlock";

/**
 * Mines `numberOfBlocks` new blocks.
 *
 * @param numberOfBlocks Must be greater than 0
 * @returns number of the latest block mined
 */
export async function advanceBlock(
  numberOfBlocks: NumberLike = 1
): Promise<number> {
  const provider = await getHardhatProvider();

  const blocksParam = toBigInt(numberOfBlocks);
  assertPositiveNumber(blocksParam);

  await provider.request({
    method: "hardhat_mine",
    params: [toRpcQuantity(blocksParam)],
  });

  return latestBlock();
}

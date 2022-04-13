import type { NumberLike } from "../../types";

import {
  getHardhatProvider,
  toRpcQuantity,
  assertLargerThan,
} from "../../utils";

import { latestBlock } from "./latestBlock";

/**
 * Mines new blocks until the latest block number is `blockNumber`
 *
 * @param blockNumber Must be greater than the latest block's number
 */
export async function advanceBlockTo(blockNumber: NumberLike): Promise<void> {
  const provider = await getHardhatProvider();

  const blockRPC = toRpcQuantity(blockNumber);
  const latestHeight = await latestBlock();

  assertLargerThan(parseInt(blockRPC, 16), latestHeight, "blockNumber");

  const blockParam = toRpcQuantity(parseInt(blockRPC, 16) - latestHeight);

  await provider.request({ method: "hardhat_mine", params: [blockParam] });
}

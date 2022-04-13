import type { NumberLike } from "../../types";

import {
  getHardhatProvider,
  toRpcQuantity,
  assertPositiveNumber,
} from "../../utils";

import { latest } from "./latest";

/**
 * Mines a new block whose timestamp is `amountInSeconds` after the latest block's timestamp
 *
 * @param amountInSeconds number of seconds to increase the next block's timestamp by
 * @returns the timestamp of the mined block
 */
export async function increase(amountInSeconds: NumberLike): Promise<number> {
  const provider = await getHardhatProvider();

  const amountRPC = toRpcQuantity(amountInSeconds);
  assertPositiveNumber(amountRPC);

  const latestTimestamp = await latest();

  const amountParam = toRpcQuantity(parseInt(amountRPC, 16) + latestTimestamp);

  await provider.request({
    method: "evm_mine",
    params: [amountParam],
  });

  return parseInt(amountParam, 16);
}

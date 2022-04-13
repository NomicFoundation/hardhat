import type { NumberLike } from "../../types";

import {
  getHardhatProvider,
  toRpcQuantity,
  assertLargerThan,
} from "../../utils";

import { latest } from "./latest";

/**
 * Mines a new block whose timestamp is `timestamp`
 *
 * @param timestamp Must be bigger than the latest block's timestamp
 */
export async function increaseTo(timestamp: NumberLike): Promise<void> {
  const provider = await getHardhatProvider();

  const timestampParam = toRpcQuantity(timestamp);

  const latestTimestamp = await latest();

  assertLargerThan(parseInt(timestampParam, 16), latestTimestamp, "timestamp");

  await provider.request({
    method: "evm_mine",
    params: [timestampParam],
  });
}

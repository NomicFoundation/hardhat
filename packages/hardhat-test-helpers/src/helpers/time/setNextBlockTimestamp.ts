import type { NumberLike } from "../../types";

import {
  getHardhatProvider,
  toRpcQuantity,
  assertLargerThan,
} from "../../utils";

import { latest } from "./latest";
import { millis } from "./duration";

/**
 * Sets the timestamp of the next block but doesn't mine one.
 *
 * @param timestamp Can be `Date` or Epoch seconds. Must be greater than the latest block's timestamp
 */
export async function setNextBlockTimestamp(
  timestamp: NumberLike | Date
): Promise<void> {
  const provider = await getHardhatProvider();

  const timestampRPC = toRpcQuantity(
    timestamp instanceof Date ? millis(timestamp.valueOf()) : timestamp
  );

  const latestTimestamp = await latest();

  assertLargerThan(parseInt(timestampRPC, 16), latestTimestamp, "timestamp");

  const amountParam = toRpcQuantity(
    parseInt(timestampRPC, 16) - latestTimestamp
  );

  await provider.request({
    method: "evm_increaseTime",
    params: [amountParam],
  });
}

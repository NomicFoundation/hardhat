import type { NumberLike } from "../../../types.js";
import type { Time } from "../time/time.js";
import type { EthereumProvider } from "hardhat/types/providers";

import { assertLargerThan } from "../../assertions.js";
import { toBigInt, toRpcQuantity } from "../../conversion.js";

export async function mineUpTo(
  provider: EthereumProvider,
  blockNumber: NumberLike,
  time: Time,
): Promise<void> {
  const normalizedBlockNumber = await toBigInt(blockNumber);
  const latestHeight = await toBigInt(await time.latestBlock());

  assertLargerThan(normalizedBlockNumber, latestHeight);

  const blockParam = normalizedBlockNumber - latestHeight;

  await provider.request({
    method: "hardhat_mine",
    params: [toRpcQuantity(blockParam)],
  });
}

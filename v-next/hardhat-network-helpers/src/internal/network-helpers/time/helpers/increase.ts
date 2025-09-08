import type { NetworkHelpers, NumberLike } from "../../../../types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import { toBigInt, toRpcQuantity } from "../../../conversion.js";

export async function increase(
  provider: EthereumProvider,
  networkHelpers: NetworkHelpers,
  amountInSeconds: NumberLike,
): Promise<number> {
  const normalizedAmount = toBigInt(amountInSeconds);
  const latestTimestamp = toBigInt(await networkHelpers.time.latest());
  const targetTimestamp = latestTimestamp + normalizedAmount;

  await provider.request({
    method: "evm_setNextBlockTimestamp",
    params: [toRpcQuantity(targetTimestamp)],
  });

  await networkHelpers.mine();

  return networkHelpers.time.latest();
}

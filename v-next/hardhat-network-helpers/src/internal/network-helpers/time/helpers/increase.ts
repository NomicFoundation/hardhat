import type { NetworkHelpers, NumberLike } from "../../../../types.js";
import type { ChainType } from "hardhat/types/network";
import type { EthereumProvider } from "hardhat/types/providers";

import { toBigInt, toRpcQuantity } from "../../../conversion.js";

export async function increase<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  networkHelpers: NetworkHelpers<ChainTypeT>,
  amountInSeconds: NumberLike,
): Promise<number> {
  const normalizedAmount = await toBigInt(amountInSeconds);
  const latestTimestamp = await toBigInt(await networkHelpers.time.latest());
  const targetTimestamp = latestTimestamp + normalizedAmount;

  await provider.request({
    method: "evm_setNextBlockTimestamp",
    params: [toRpcQuantity(targetTimestamp)],
  });

  await networkHelpers.mine();

  return networkHelpers.time.latest();
}

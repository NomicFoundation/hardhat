import type {
  Duration,
  NetworkHelpers,
  NumberLike,
} from "../../../../types.js";
import type { ChainType } from "hardhat/types/network";
import type { EthereumProvider } from "hardhat/types/providers";

import { toBigInt, toRpcQuantity } from "../../../conversion.js";

export async function increaseTo<ChainTypeT extends ChainType | string>(
  provider: EthereumProvider,
  networkHelpers: NetworkHelpers<ChainTypeT>,
  timestamp: NumberLike | Date,
  duration: Duration,
): Promise<void> {
  const normalizedTimestamp = await toBigInt(
    timestamp instanceof Date
      ? duration.millis(timestamp.valueOf())
      : timestamp,
  );

  await provider.request({
    method: "evm_setNextBlockTimestamp",
    params: [toRpcQuantity(normalizedTimestamp)],
  });

  await networkHelpers.mine();
}

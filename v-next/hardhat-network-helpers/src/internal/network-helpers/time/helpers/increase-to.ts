import type {
  Duration,
  NetworkHelpers,
  NumberLike,
} from "../../../../types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import { toBigInt, toRpcQuantity } from "../../../conversion.js";

export async function increaseTo(
  provider: EthereumProvider,
  networkHelpers: NetworkHelpers,
  timestamp: NumberLike | Date,
  duration: Duration,
): Promise<void> {
  const normalizedTimestamp = toBigInt(
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

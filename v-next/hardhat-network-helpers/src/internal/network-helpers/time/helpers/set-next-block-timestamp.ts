import type { Duration, NumberLike } from "../../../../types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import { toRpcQuantity } from "../../../conversion.js";

export async function setNextBlockTimestamp(
  provider: EthereumProvider,
  timestamp: NumberLike | Date,
  duration: Duration,
): Promise<void> {
  const timestampRpc = toRpcQuantity(
    timestamp instanceof Date
      ? duration.millis(timestamp.valueOf())
      : timestamp,
  );

  await provider.request({
    method: "evm_setNextBlockTimestamp",
    params: [timestampRpc],
  });
}

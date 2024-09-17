import type { NumberLike } from "../../../../types.js";
import type { Duration } from "../../duration/duration.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

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

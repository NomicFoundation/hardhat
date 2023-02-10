import type { NumberLike } from "../types";
import { getHardhatProvider, toNumber } from "../utils";

export async function reset(
  url?: string,
  blockNumber?: NumberLike
): Promise<void> {
  const provider = await getHardhatProvider();

  if (url === undefined) {
    await provider.request({
      method: "hardhat_reset",
      params: [],
    });
  } else if (blockNumber === undefined) {
    await provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: url,
          },
        },
      ],
    });
  } else {
    await provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: url,
            blockNumber: toNumber(blockNumber),
          },
        },
      ],
    });
  }
}

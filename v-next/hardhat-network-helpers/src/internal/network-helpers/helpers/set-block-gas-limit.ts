import type { NumberLike } from "../../../types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import { toRpcQuantity } from "../../conversion.js";

export async function setBlockGasLimit(
  provider: EthereumProvider,
  blockGasLimit: NumberLike,
): Promise<void> {
  const blockGasLimitHex = toRpcQuantity(blockGasLimit);

  await provider.request({
    method: "evm_setBlockGasLimit",
    params: [blockGasLimitHex],
  });
}

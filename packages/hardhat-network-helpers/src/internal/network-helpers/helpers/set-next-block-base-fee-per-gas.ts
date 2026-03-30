import type { NumberLike } from "../../../types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import { toRpcQuantity } from "../../conversion.js";

export async function setNextBlockBaseFeePerGas(
  provider: EthereumProvider,
  baseFeePerGas: NumberLike,
): Promise<void> {
  const baseFeePerGasHex = toRpcQuantity(baseFeePerGas);

  await provider.request({
    method: "hardhat_setNextBlockBaseFeePerGas",
    params: [baseFeePerGasHex],
  });
}

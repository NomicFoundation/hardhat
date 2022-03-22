import type { NumberLike } from "../types";
import { getHardhatProvider, toRpcQuantity } from "../utils";

export async function setBlockGasLimit(
  blockGasLimit: NumberLike
): Promise<void> {
  const provider = await getHardhatProvider();

  const blockGasLimitHex = toRpcQuantity(blockGasLimit);

  await provider.request({
    method: "evm_setBlockGasLimit",
    params: [blockGasLimitHex],
  });
}

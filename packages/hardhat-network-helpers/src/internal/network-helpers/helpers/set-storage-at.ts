import type { NumberLike } from "../../../types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import { assertValidAddress } from "../../assertions.js";
import { toRpcQuantity } from "../../conversion.js";
import { toPaddedRpcQuantity } from "../../padding.js";

export async function setStorageAt(
  provider: EthereumProvider,
  address: string,
  index: NumberLike,
  value: NumberLike,
): Promise<void> {
  await assertValidAddress(address);

  const indexParam = toRpcQuantity(index);
  const codeParam = toPaddedRpcQuantity(value, 32);

  await provider.request({
    method: "hardhat_setStorageAt",
    params: [address, indexParam, codeParam],
  });
}

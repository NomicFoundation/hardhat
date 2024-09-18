import type { NumberLike } from "../../../types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import { assertValidAddress } from "../../assertions.js";
import { toRpcQuantity } from "../../conversion.js";

export async function setBalance(
  provider: EthereumProvider,
  address: string,
  balance: NumberLike,
): Promise<void> {
  await assertValidAddress(address);

  const balanceHex = toRpcQuantity(balance);

  await provider.request({
    method: "hardhat_setBalance",
    params: [address, balanceHex],
  });
}

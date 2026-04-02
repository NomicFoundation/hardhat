import type { NumberLike } from "../../../types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import { assertValidAddress } from "../../assertions.js";
import { toRpcQuantity } from "../../conversion.js";

export async function setNonce(
  provider: EthereumProvider,
  address: string,
  nonce: NumberLike,
): Promise<void> {
  await assertValidAddress(address);

  const nonceHex = toRpcQuantity(nonce);

  await provider.request({
    method: "hardhat_setNonce",
    params: [address, nonceHex],
  });
}

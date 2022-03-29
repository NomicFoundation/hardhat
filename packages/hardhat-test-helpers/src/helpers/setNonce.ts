import type { NumberLike } from "../types";
import {
  getHardhatProvider,
  assertValidAddress,
  toRpcQuantity,
} from "../utils";

export async function setNonce(
  address: string,
  nonce: NumberLike
): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(address);
  const nonceHex = toRpcQuantity(nonce);

  await provider.request({
    method: "hardhat_setNonce",
    params: [address, nonceHex],
  });
}

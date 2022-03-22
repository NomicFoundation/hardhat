import type { NumberLike } from "../types";
import {
  getHardhatProvider,
  assertValidAddress,
  toRpcQuantity,
} from "../utils";

export async function setNonce(
  hexAddress: string,
  nonce: NumberLike
): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(hexAddress);
  const nonceHex = toRpcQuantity(nonce);

  await provider.request({
    method: "hardhat_setNonce",
    params: [hexAddress, nonceHex],
  });
}

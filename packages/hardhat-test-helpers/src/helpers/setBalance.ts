import type { NumberLike } from "../types";
import {
  getHardhatProvider,
  assertValidAddress,
  toRpcQuantity,
} from "../utils";

export async function setBalance(
  hexAddress: string,
  balance: NumberLike
): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(hexAddress);
  const balanceHex = toRpcQuantity(balance);

  await provider.request({
    method: "hardhat_setBalance",
    params: [hexAddress, balanceHex],
  });
}

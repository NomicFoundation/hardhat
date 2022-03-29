import type { NumberLike } from "../types";
import {
  getHardhatProvider,
  assertValidAddress,
  toRpcQuantity,
} from "../utils";

export async function setBalance(
  address: string,
  balance: NumberLike
): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(address);
  const balanceHex = toRpcQuantity(balance);

  await provider.request({
    method: "hardhat_setBalance",
    params: [address, balanceHex],
  });
}

import type { NumberLike } from "../types";
import {
  getHardhatProvider,
  assertValidAddress,
  toRpcQuantity,
} from "../utils";

export async function setStorageAt(
  address: string,
  index: NumberLike,
  code: NumberLike
): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(address);
  const indexParam = toRpcQuantity(index);
  const codeParam = `0x${toRpcQuantity(code).slice(2).padStart(64, "0")}`;

  await provider.request({
    method: "hardhat_setStorageAt",
    params: [address, indexParam, codeParam],
  });
}

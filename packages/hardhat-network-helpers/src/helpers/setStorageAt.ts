import type { NumberLike } from "../types";
import {
  getHardhatProvider,
  assertValidAddress,
  toRpcQuantity,
} from "../utils";

/**
 * Writes a single position of an account's storage
 *
 * @param address The address where the code should be stored
 * @param index The index in storage
 * @param code The code to store
 */
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

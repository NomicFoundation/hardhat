import type { NumberLike } from "../types";
import {
  getHardhatProvider,
  assertValidAddress,
  toRpcQuantity,
} from "../utils";

export async function getStorageAt(
  hexAddress: string,
  index: NumberLike,
  block = "latest"
): Promise<string> {
  const provider = await getHardhatProvider();

  assertValidAddress(hexAddress);
  const hexIndex = toRpcQuantity(index);

  const data = await provider.request({
    method: "eth_getStorageAt",
    params: [hexAddress, hexIndex, block],
  });

  return data as string;
}

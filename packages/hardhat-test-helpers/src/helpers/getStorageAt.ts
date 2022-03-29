import type { NumberLike, BlockTag } from "../types";
import {
  getHardhatProvider,
  assertValidAddress,
  toRpcQuantity,
} from "../utils";

export async function getStorageAt(
  address: string,
  index: NumberLike,
  block: NumberLike | BlockTag = "latest"
): Promise<string> {
  const provider = await getHardhatProvider();

  assertValidAddress(address);
  const indexParam = toRpcQuantity(index);

  let blockParam: NumberLike | BlockTag;
  switch (block) {
    case "latest":
    case "earliest":
    case "pending":
      blockParam = block;
      break;
    default:
      blockParam = toRpcQuantity(block);
  }

  const data = await provider.request({
    method: "eth_getStorageAt",
    params: [address, indexParam, blockParam],
  });

  return data as string;
}

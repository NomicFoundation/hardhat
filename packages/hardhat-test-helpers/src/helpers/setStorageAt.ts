import type { NumberLike } from "../types";
import {
  getHardhatProvider,
  assertValidAddress,
  assertHexString,
  toRpcQuantity,
} from "../utils";

export async function setStorageAt(
  hexAddress: string,
  index: NumberLike,
  code: string
): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(hexAddress);
  assertHexString(code);
  const indexHex = toRpcQuantity(index);

  // code to write must be 32 bytes (64 char + 0x prefix = 66)
  if (code.length !== 66) {
    throw new Error(
      "[hardhat-test-helpers] code given to setStorageAt must be 32 bytes long"
    );
  }

  await provider.request({
    method: "hardhat_setStorageAt",
    params: [hexAddress, indexHex, code],
  });
}

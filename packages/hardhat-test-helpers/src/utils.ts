import { isValidChecksumAddress } from "ethereumjs-util";

import type { EIP1193Provider } from "hardhat/types";

import type { NumberLike } from "./types";

async function checkIfHardhatNetwork(
  provider: EIP1193Provider
): Promise<boolean> {
  try {
    // we call a method that only exists in the hardhat network
    await provider.request({
      method: "hardhat_getAutomine",
    });

    return true;
  } catch (e) {
    return false;
  }
}

export async function getHardhatProvider(): Promise<EIP1193Provider> {
  try {
    const hre = await import("hardhat");

    const provider = hre.network.provider;

    const isHardhatNetwork = await checkIfHardhatNetwork(provider);

    if (!isHardhatNetwork) {
      throw new Error(
        "[hardhat-test-helpers] This helper can only be used on the hardhat network"
      );
    }

    return hre.network.provider;
  } catch (e: any) {
    if (e.code === "MODULE_NOT_FOUND") {
      throw new Error(
        "[hardhat-test-helpers] These helpers can only be used inside a hardhat project"
      );
    }

    throw e;
  }
}

export function toRpcQuantity(x: NumberLike): string {
  let hex: string;
  if (typeof x === "number" || typeof x === "bigint") {
    // TODO: check that number is safe
    hex = `0x${x.toString(16)}`;
  } else if (typeof x === "string") {
    if (!x.startsWith("0x")) {
      throw new Error(
        "[hardhat-test-helpers] Only 0x-prefixed hex-encoded strings are accepted"
      );
    }
    hex = x;
  } else if ("toHexString" in x) {
    hex = x.toHexString();
  } else if ("toString" in x) {
    hex = x.toString(16);
  } else {
    throw new Error(
      `[hardhat-test-helpers] ${x} cannot be converted to an RPC quantity`
    );
  }

  return hex.startsWith("0x") ? hex.replace("0x0", "0x") : `0x${hex}`;
}

export function assertValidAddress(address: string): void {
  const hasChecksum = address !== address.toLowerCase();
  if (!hasChecksum || !isValidChecksumAddress(address)) {
    throw new Error(
      `[hardhat-test-helpers] ${address} is not a valid hex address`
    );
  }
}

export function assertHexString(hexString: string): void {
  if (typeof hexString !== "string" || !/^0x[0-9a-fA-F]+$/.test(hexString)) {
    throw new Error(
      `[hardhat-test-helpers] ${hexString} is not a valid hex string`
    );
  }
}

export function assertTxHash(hexString: string): void {
  assertHexString(hexString);
  if (hexString.length !== 66) {
    throw new Error(
      `[hardhat-test-helpers] ${hexString} is not a valid transaction hash`
    );
  }
}

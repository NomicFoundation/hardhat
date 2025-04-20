import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  isAddress,
  isValidChecksumAddress,
} from "@nomicfoundation/hardhat-utils/eth";

export function assertHexString(hexString: string): void {
  if (typeof hexString !== "string" || !/^0x[0-9a-fA-F]+$/.test(hexString)) {
    throw new HardhatError(
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.INVALID_HEX_STRING,
      {
        value: hexString,
      },
    );
  }
}

export function assertTxHash(hexString: string): void {
  assertHexString(hexString);

  if (hexString.length !== 66) {
    throw new HardhatError(
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.INVALID_TX_HASH,
      {
        value: hexString,
      },
    );
  }
}

export async function assertValidAddress(address: string): Promise<void> {
  if (!isAddress(address)) {
    throw new HardhatError(
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.INVALID_ADDRESS,
      {
        value: address,
      },
    );
  }

  const hasChecksum = address !== address.toLowerCase();

  if (hasChecksum && !(await isValidChecksumAddress(address))) {
    throw new HardhatError(
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.INVALID_CHECKSUM_ADDRESS,
      {
        value: address,
      },
    );
  }
}

export function assertLargerThan(a: bigint, b: bigint): void;
export function assertLargerThan(a: number, b: number): void;
export function assertLargerThan(a: number | bigint, b: number | bigint): void {
  if (a <= b) {
    throw new HardhatError(
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.BLOCK_NUMBER_SMALLER_THAN_CURRENT,
      {
        newValue: a,
        currentValue: b,
      },
    );
  }
}

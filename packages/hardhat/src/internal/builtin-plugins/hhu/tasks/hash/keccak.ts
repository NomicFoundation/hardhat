import type { NewUtilsTaskActionFunction } from "../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { utf8StringToBytes } from "@nomicfoundation/hardhat-utils/bytes";
import { keccak256 } from "@nomicfoundation/hardhat-utils/crypto";
import {
  bytesToHexString,
  getUnprefixedHexString,
  hexStringToBytes,
  isHexString,
  isPrefixedHexString,
} from "@nomicfoundation/hardhat-utils/hex";

interface KeccakActionArguments {
  value: string;
}

const keccakAction: NewUtilsTaskActionFunction<KeccakActionArguments> = async ({
  value,
}) => {
  let bytes: Uint8Array;

  if (isPrefixedHexString(value)) {
    if (!isHexString(value)) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.GENERAL.INVALID_HEX_STRING,
        { value },
      );
    }

    const unprefixed = getUnprefixedHexString(value);
    if (unprefixed.length % 2 !== 0) {
      throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
        value,
        name: "value",
        reason: "it must have an even number of hex digits",
      });
    }

    // hexStringToBytes maps "" to 0x00, but "0x" must hash as empty bytes
    bytes =
      unprefixed.length === 0 ? new Uint8Array() : hexStringToBytes(unprefixed);
  } else {
    bytes = utf8StringToBytes(value);
  }

  console.log(bytesToHexString(await keccak256(bytes)));
};

export default keccakAction;

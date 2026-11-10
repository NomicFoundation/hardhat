import type { AbiParameter } from "@nomicfoundation/hardhat-utils/abi";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { parseAbiFunctionSignature } from "@nomicfoundation/hardhat-utils/abi";
import {
  isAddress,
  isValidChecksumAddress,
} from "@nomicfoundation/hardhat-utils/eth";
import {
  getUnprefixedHexString,
  isHexString,
  isPrefixedHexString,
  normalizeHexString,
  numberToHexString,
} from "@nomicfoundation/hardhat-utils/hex";

import { parseSignatureArgument } from "../abi/arguments.js";
import { encodeFunctionCall } from "../abi/encode.js";
import { parseBlockArgument } from "../block.js";

export interface CallRequestArguments {
  to: string;
  signature?: string;
  args: string[];
  data?: string;
  from?: string;
  value: bigint;
  block: string;
}

/**
 * Builds the params of the `eth_call` or `eth_estimateGas` request of the tx
 * tasks.
 *
 * @param taskArguments The task's arguments.
 * @returns The params, and the signature's return types, if any.
 * @throws HardhatError If an argument is invalid.
 */
export async function buildCallRequest({
  to,
  signature,
  args,
  data,
  from,
  value,
  block,
}: CallRequestArguments): Promise<{
  params: unknown[];
  outputs: readonly AbiParameter[];
}> {
  await assertAddressArgument(to, "to");

  if (from !== undefined) {
    await assertAddressArgument(from, "from");
  }

  if (data !== undefined && signature !== undefined) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: data,
      name: "data",
      reason: "it can't be used together with a signature",
    });
  }

  if (
    data !== undefined &&
    (!isPrefixedHexString(data) ||
      !isHexString(data) ||
      getUnprefixedHexString(data).length % 2 !== 0)
  ) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: data,
      name: "data",
      reason: "it must be 0x-hex with an even number of digits",
    });
  }

  let calldata = data ?? "0x";
  let outputs: readonly AbiParameter[] = [];

  if (signature !== undefined) {
    const parsed = parseSignatureArgument(
      parseAbiFunctionSignature,
      signature,
      "signature",
    );

    calldata = await encodeFunctionCall(parsed, args, "args");
    outputs = parsed.outputs;
  }

  // Lowercased, as some nodes reject a "0X" prefix
  const transaction = {
    to: normalizeHexString(to),
    ...(from !== undefined && { from: normalizeHexString(from) }),
    data: normalizeHexString(calldata),
    value: numberToHexString(value),
  };

  return {
    params: [transaction, parseBlockArgument(block, "block")],
    outputs,
  };
}

async function assertAddressArgument(
  value: string,
  name: string,
): Promise<void> {
  if (!isAddress(value)) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value,
      name,
      reason: "it must be a valid Ethereum address",
    });
  }

  // Like the encoder, mixed-case addresses must pass the EIP-55 checksum, to
  // catch typos. The prefix can be "0X".
  const hex = value.slice(2);
  if (
    hex !== hex.toLowerCase() &&
    hex !== hex.toUpperCase() &&
    !(await isValidChecksumAddress(`0x${hex}`))
  ) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value,
      name,
      reason: "it has an invalid address checksum",
    });
  }
}

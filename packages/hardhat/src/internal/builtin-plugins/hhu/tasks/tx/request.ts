import type { AbiParameter } from "@nomicfoundation/hardhat-utils/abi";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { parseAbiFunctionSignature } from "@nomicfoundation/hardhat-utils/abi";
import {
  getUnprefixedHexString,
  isHexString,
  isPrefixedHexString,
  normalizeHexString,
  numberToHexString,
} from "@nomicfoundation/hardhat-utils/hex";

import { parseSignatureArgument } from "../abi/arguments.js";
import { encodeFunctionCall } from "../abi/encode.js";
import { parseAddressArgument } from "../address.js";
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
  const toAddress = await parseAddressArgument(to, "to");
  const fromAddress =
    from !== undefined ? await parseAddressArgument(from, "from") : undefined;

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
    to: toAddress,
    ...(fromAddress !== undefined && { from: fromAddress }),
    data: normalizeHexString(calldata),
    value: numberToHexString(value),
  };

  return {
    params: [transaction, parseBlockArgument(block, "block")],
    outputs,
  };
}

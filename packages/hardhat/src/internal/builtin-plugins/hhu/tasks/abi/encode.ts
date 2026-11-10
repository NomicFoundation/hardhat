import type {
  AbiFunctionSignature,
  AbiParameter,
} from "@nomicfoundation/hardhat-utils/abi";
import type { PrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  encodeAbiParameters,
  getAbiSelector,
  isAbiEncodingError,
} from "@nomicfoundation/hardhat-utils/abi";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { getUnprefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

/**
 * ABI-encodes command line values for a list of parameters.
 *
 * Arrays and tuples are written as JSON, with addresses, hex and strings
 * quoted, like `[1,"0x..."]`. Every other value is taken as written and
 * validated by the encoder, so integers can be decimal or hex, and booleans
 * are `true` or `false`.
 *
 * @param parameters The parameters to encode the values as.
 * @param values The values, in the order of the parameters.
 * @param name The name of the task argument the values come from, for errors.
 * @returns The encoded values as a prefixed hex string, or "0x" if there are none.
 * @throws HardhatError If a value is missing, malformed or out of range.
 */
export async function encodeArguments(
  parameters: readonly AbiParameter[],
  values: string[],
  name: string,
): Promise<PrefixedHexString> {
  const parsedValues = values.map((value, i) =>
    parseValue(parameters[i], value, name),
  );

  try {
    return await encodeAbiParameters(parameters, parsedValues);
  } catch (error) {
    ensureError(error);

    if (!isAbiEncodingError(error)) {
      throw error;
    }

    throw new HardhatError(
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
      { value: values.join(" "), name, reason: error.message },
      error,
    );
  }
}

/**
 * ABI-encodes a function call: the selector, then the values as
 * `encodeArguments` encodes them.
 *
 * @param signature The parsed function signature.
 * @param values The values, in the order of the parameters.
 * @param name The task argument the values come from, for errors.
 * @returns The calldata.
 * @throws HardhatError If a value is missing, malformed or out of range.
 */
export async function encodeFunctionCall(
  signature: AbiFunctionSignature,
  values: string[],
  name: string,
): Promise<PrefixedHexString> {
  const selector = await getAbiSelector(signature);
  const encoded = await encodeArguments(signature.inputs, values, name);

  return `${selector}${getUnprefixedHexString(encoded)}`;
}

function parseValue(
  parameter: AbiParameter | undefined,
  value: string,
  name: string,
): unknown {
  // An extra value has no parameter; the encoder reports the count mismatch
  if (parameter === undefined) {
    return value;
  }

  // Only arrays and tuples have a structure to parse. Other values are passed
  // as written, so a string like "[1]" is encoded as is.
  if (!parameter.type.endsWith("]") && parameter.type !== "tuple") {
    return value;
  }

  try {
    // The reviver's third argument is the number's source text (Node 21+), so
    // integers beyond 2^53 reach the encoder exact, as it parses numeric strings
    return JSON.parse(
      value,
      (_key, parsed: unknown, context?: { source?: string }) =>
        typeof parsed === "number" && context?.source !== undefined
          ? context.source
          : parsed,
    );
  } catch (error) {
    ensureError(error);

    throw new HardhatError(
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
      {
        value,
        name,
        // The parser's message is kept, as it says where the JSON breaks
        reason: `${parameter.type} values must be written as JSON, with addresses, hex and strings quoted, like [1,"0x..."]: ${error.message}`,
      },
      error,
    );
  }
}

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isInvalidAbiSignatureError } from "@nomicfoundation/hardhat-utils/abi";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

/**
 * Parses the value of a task argument (i.e. what the user wrote on the command
 * line) that holds a human-readable ABI signature, using one of the
 * hardhat-utils signature parsers, like `parseAbiSignature`.
 *
 * Parsing errors are reported as an invalid value of that task argument.
 *
 * @param parse The hardhat-utils signature parser to use.
 * @param value The task argument's value.
 * @param argumentName The task argument's name, used to report errors.
 * @returns The parsed value.
 * @throws HardhatError If the value can't be parsed.
 */
export function parseSignatureArgument<ParsedT>(
  parse: (value: string) => ParsedT,
  value: string,
  argumentName: string,
): ParsedT {
  try {
    return parse(value);
  } catch (error) {
    ensureError(error);

    if (!isInvalidAbiSignatureError(error)) {
      throw error;
    }

    throw new HardhatError(
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
      { value, name: argumentName, reason: error.reason },
      error,
    );
  }
}

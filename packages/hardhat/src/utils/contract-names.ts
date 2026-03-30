import { HardhatError } from "@nomicfoundation/hardhat-errors";

/**
 * Combines a source file name and a contract name into a fully qualified name.
 *
 * @param sourceName The name or path of the source file (e.g., "contracts/MyToken.sol").
 * @param contractName The name of the contract declared in that source file.
 * @returns The fully qualified name in the form "sourceName:contractName".
 */
export function getFullyQualifiedName(
  sourceName: string,
  contractName: string,
): string {
  return `${sourceName}:${contractName}`;
}

/**
 * Checks whether a given string is a fully qualified name.
 *
 * A fully qualified name contains at least one colon (`:`) separating
 * the source and contract segments.
 *
 * @param name The string to test.
 * @returns `true` if the string contains a colon, `false` otherwise.
 */
export function isFullyQualifiedName(name: string): boolean {
  return name.includes(":");
}

/**
 * Parses a fully qualified name into its source and contract components.
 *
 * @param fullyQualifiedName The name in the form "sourceName:contractName".
 * @returns An object with `sourceName` and `contractName` properties.
 * @throws {HardhatError} If the input does not contain a source segment.
 */
export function parseFullyQualifiedName(fullyQualifiedName: string): {
  sourceName: string;
  contractName: string;
} {
  const { sourceName, contractName } = parseName(fullyQualifiedName);

  if (sourceName === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.INVALID_FULLY_QUALIFIED_NAME,
      {
        name: fullyQualifiedName,
      },
    );
  }

  return { sourceName, contractName };
}

/**
 * Splits a string into optional source and contract name parts.
 *
 * If the input contains no colon, `sourceName` will be `undefined`
 * and `contractName` will be the entire string.
 *
 * @param name The string to split, which may be "contractName" or "source:contractName".
 * @returns An object with:
 *   - `sourceName`: the joined segments before the last colon, or `undefined` if none.
 *   - `contractName`: the segment after the last colon, or the entire string if no colon.
 */
export function parseName(name: string): {
  sourceName?: string;
  contractName: string;
} {
  const parts = name.split(":");

  if (parts.length === 1) {
    return { contractName: parts[0] };
  }

  const contractName = parts[parts.length - 1];
  const sourceName = parts.slice(0, parts.length - 1).join(":");

  return { sourceName, contractName };
}

import { HardhatError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";

/**
 * Returns a fully qualified name from a sourceName and contractName.
 */
export function getFullyQualifiedName(
  sourceName: string,
  contractName: string
): string {
  return `${sourceName}:${contractName}`;
}

/**
 * Returns true if a name is fully qualified, and not just a bare contract name.
 */
export function isFullyQualifiedName(name: string): boolean {
  return name.includes(":");
}

/**
 * Parses a fully qualified name.
 *
 * @param fullyQualifiedName It MUST be a fully qualified name.
 */
export function parseFullyQualifiedName(fullyQualifiedName: string): {
  sourceName: string;
  contractName: string;
} {
  const { sourceName, contractName } = parseName(fullyQualifiedName);

  if (sourceName === undefined) {
    throw new HardhatError(ERRORS.CONTRACT_NAMES.INVALID_FULLY_QUALIFIED_NAME, {
      name: fullyQualifiedName,
    });
  }

  return { sourceName, contractName };
}

/**
 * Parses a name, which can be a bare contract name, or a fully qualified name.
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

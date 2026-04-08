import type { RawInlineOverride } from "./types.js";
import type { TestFunctionConfigOverride } from "@nomicfoundation/edr";

import { bytesIncludesUtf8String } from "@nomicfoundation/hardhat-utils/bytes";

import { getFullyQualifiedName } from "../../../../utils/contract-names.js";

import {
  HARDHAT_CONFIG_PREFIX,
  FORGE_CONFIG_PREFIX,
  KEY_TYPES,
} from "./constants.js";

/**
 * Returns true if the build info bytes contain either of the inline config
 * prefixes.
 */
export function buildInfoContainsInlineConfig(
  buildInfoBytes: Uint8Array,
): boolean {
  return (
    bytesIncludesUtf8String(buildInfoBytes, HARDHAT_CONFIG_PREFIX) ||
    bytesIncludesUtf8String(buildInfoBytes, FORGE_CONFIG_PREFIX)
  );
}

/**
 * Finds the function selector for a given function name in the methodIdentifiers
 * map. Matches the first entry whose signature starts with `functionName(`.
 * Returns the selector prefixed with "0x".
 */
export function resolveFunctionSelector(
  methodIdentifiers: Record<string, string>,
  functionName: string,
): string | undefined {
  const prefix = `${functionName}(`;

  for (const [signature, selector] of Object.entries(methodIdentifiers)) {
    if (signature.startsWith(prefix)) {
      return `0x${selector}`;
    }
  }

  return undefined;
}

/**
 * Converts a validated set of raw overrides into a TestFunctionConfigOverride
 * object.
 */
export function buildConfigOverride(
  overrides: RawInlineOverride[],
): TestFunctionConfigOverride {
  const config: Record<string, unknown> = {};
  const fuzz: Record<string, unknown> = {};
  const invariant: Record<string, unknown> = {};

  for (const override of overrides) {
    const expectedType = KEY_TYPES[override.key];
    const parsed =
      expectedType === "number"
        ? Number(override.rawValue)
        : override.rawValue.toLowerCase() === "true";

    const dotIndex = override.key.indexOf(".");
    if (dotIndex === -1) {
      // Top-level key, like "allowInternalExpectRevert"
      config[override.key] = parsed;
    } else {
      const section = override.key.slice(0, dotIndex);
      const field = override.key.slice(dotIndex + 1);
      const target = section === "fuzz" ? fuzz : invariant;
      target[field] = field === "timeout" ? { time: parsed } : parsed;
    }
  }

  if (Object.keys(fuzz).length > 0) {
    config.fuzz = fuzz;
  }
  if (Object.keys(invariant).length > 0) {
    config.invariant = invariant;
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  Cast is safe because we have validated all keys and value types in the previous step. */
  return config as TestFunctionConfigOverride;
}

/**
 * Constructs a fully qualified function name, in the format
 * "source.sol:ContractName#functionName".
 */
export function getFunctionFqn(
  inputSourceName: string,
  contractName: string,
  functionName: string,
): string {
  return `${getFullyQualifiedName(inputSourceName, contractName)}#${functionName}`;
}

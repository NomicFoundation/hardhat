import type { RawInlineOverride } from "./types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { KEY_TYPES } from "./constants.js";
import { getFunctionFqn } from "./helpers.js";

/**
 * Validates a list of raw inline overrides, checking for:
 * - Valid keys
 * - No duplicate keys for the same function
 * - Values of the expected type (numbers must be non-negative integers, booleans
 *   must be "true" or "false")
 *
 * Throws a HardhatError if any validation fails.
 */
export function validateInlineOverrides(overrides: RawInlineOverride[]): void {
  const seen = new Set<string>();

  for (const {
    inputSourceName,
    contractName,
    functionName,
    functionSelector,
    rawKey,
    rawValue,
    key,
  } of overrides) {
    const functionFqn = getFunctionFqn(
      inputSourceName,
      contractName,
      functionName,
    );

    // Validate key
    if (!Object.hasOwn(KEY_TYPES, key)) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_KEY,
        {
          key: rawKey,
          validKeys: Object.keys(KEY_TYPES).join(", "),
          functionFqn,
        },
      );
    }

    // Validate key matches test type
    const dotIndex = key.indexOf(".");
    if (dotIndex !== -1) {
      const keyCategory = key.slice(0, dotIndex);
      const isFuzzTest = functionName.startsWith("test");
      const isInvariantTest = functionName.startsWith("invariant");

      if (
        (isFuzzTest && keyCategory === "invariant") ||
        (isInvariantTest && keyCategory === "fuzz")
      ) {
        const testType = isFuzzTest ? "fuzz" : "invariant";
        const validPrefix = isFuzzTest ? "fuzz." : "invariant.";
        const validKeys = Object.keys(KEY_TYPES)
          .filter((k) => k.startsWith(validPrefix) || !k.includes("."))
          .join(", ");

        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_KEY_FOR_TEST_TYPE,
          {
            key: rawKey,
            functionFqn,
            testType,
            validKeys,
          },
        );
      }
    }

    // Check for duplicates (include selector to allow same key on overloaded functions)
    const functionId =
      functionSelector !== undefined
        ? `${functionFqn}#${functionSelector}`
        : functionFqn;
    const dedupeKey = `${functionId}-${key}`;
    if (seen.has(dedupeKey)) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_DUPLICATE_KEY,
        { key: rawKey, functionFqn },
      );
    }
    seen.add(dedupeKey);

    // Validate value type
    const expectedType = KEY_TYPES[key];
    if (expectedType === "number") {
      if (
        !/^(0|[1-9]\d*)$/.test(rawValue) ||
        !Number.isSafeInteger(Number(rawValue))
      ) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
          {
            value: rawValue,
            key: rawKey,
            expectedType: "non-negative integer",
            functionFqn,
          },
        );
      }
    } else {
      const lowerValue = rawValue.toLowerCase();
      if (lowerValue !== "true" && lowerValue !== "false") {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
          {
            value: rawValue,
            key: rawKey,
            expectedType: "boolean",
            functionFqn,
          },
        );
      }
    }
  }
}

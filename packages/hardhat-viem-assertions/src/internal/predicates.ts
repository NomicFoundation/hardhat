import assert from "node:assert/strict";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { deepEqual } from "@nomicfoundation/hardhat-utils/lang";

// EIP-55 addresses are 0x-prefixed 40 hex chars; case carries only checksum info.
const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

function isAddressLike(value: unknown): value is string {
  return typeof value === "string" && ADDRESS_REGEX.test(value);
}

export function anyValue() {
  return true;
}

export async function isArgumentMatch(
  actualArgs: any[],
  expectedArgs: any[],
): Promise<boolean> {
  assert.ok(
    actualArgs.length === expectedArgs.length,
    `${actualArgs.length} arguments emitted, but ${expectedArgs.length} expected`,
  );

  for (let index = 0; index < actualArgs.length; index++) {
    const emittedArg = actualArgs[index];
    const expectedArg = expectedArgs[index];

    if (typeof expectedArg === "function") {
      try {
        if (expectedArg(emittedArg) !== true) {
          return false;
        }
      } catch (e) {
        ensureError(e);
        assert.fail(
          `The predicate of index ${index} threw when called: ${e.message}`,
        );
      }
    } else if (isAddressLike(emittedArg) && isAddressLike(expectedArg)) {
      if (emittedArg === expectedArg) {
        continue;
      }

      if (emittedArg.toLowerCase() !== expectedArg.toLowerCase()) {
        return false;
      }
    } else {
      if (!(await deepEqual(emittedArg, expectedArg))) {
        return false;
      }
    }
  }

  return true;
}

import assert from "node:assert/strict";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { deepEqual } from "@nomicfoundation/hardhat-utils/lang";

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
    } else {
      if (!(await deepEqual(emittedArg, expectedArg))) {
        return false;
      }
    }
  }

  return true;
}

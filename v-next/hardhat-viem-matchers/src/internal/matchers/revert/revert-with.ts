import type { GenericFunction } from "../../../types.js";

import assert from "node:assert/strict";

import { checkRevert } from "./utils.js";

export async function revertWith(
  fn: GenericFunction,
  expectedReason: string,
): Promise<void> {
  const reason = await checkRevert(fn);

  assert.equal(
    reason,
    expectedReason,
    `The function was expected to revert with reason "${expectedReason}", but it reverted with reason "${reason}".`,
  );
}

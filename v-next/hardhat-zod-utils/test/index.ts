import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { z } from "zod";

import { unionType } from "../src/index.js";

function assertParseResult(
  result: z.SafeParseReturnType<any, any>,
  expectedMessage: string,
) {
  assert.equal(result.error?.errors.length, 1);
  assert.equal(result.error?.errors[0].message, expectedMessage);
}

describe("unionType", () => {
  it("It should return the expected error message", function () {
    const union = unionType(
      [z.object({ a: z.string() }), z.object({ b: z.string() })],
      "Expected error message",
    );

    assertParseResult(
      union.safeParse({ a: 123, c: 123 }),
      "Expected error message",
    );

    assertParseResult(union.safeParse(123), "Expected error message");

    assertParseResult(union.safeParse({}), "Expected error message");

    assertParseResult(union.safeParse(undefined), "Expected error message");
  });
});

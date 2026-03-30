import type { Mock } from "node:test";

import assert from "node:assert/strict";

/**
 * Assert against a mocked console log as if you where dealing with
 * the full output.
 */
export function assertOutputIncludes(
  mockConsoleLog: Mock<(text: string) => void>,
  expectedText: string,
): void {
  const output = mockConsoleLog.mock.calls
    .map((call) => call.arguments[0])
    .join("\n");

  assert.ok(
    output.includes(expectedText),
    `Output should include "${expectedText}", but it was:\n${output}`,
  );
}

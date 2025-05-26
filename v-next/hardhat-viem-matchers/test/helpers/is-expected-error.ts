import assert from "node:assert/strict";

export function isExpectedError(
  error: Error & { expected?: any; actual?: any },
  errMsg: string,
  actual: any,
  expected: any,
): boolean {
  assert.ok(
    error.message.includes(errMsg),
    "The error message does not include the expected message",
  );
  assert.deepEqual(error.expected, expected);
  assert.deepEqual(error.actual, actual);

  return true;
}

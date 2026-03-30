import assert from "node:assert/strict";

/* eslint-disable-next-line no-restricted-syntax -- We use this TLA to make 
loading of this file consistently slow, otherwise the test output can be
different between local development and CI runs. */
await new Promise((resolve) => setTimeout(resolve, 75));

function pass(): void {
  assert.equal(1, 1);
}

export default pass;

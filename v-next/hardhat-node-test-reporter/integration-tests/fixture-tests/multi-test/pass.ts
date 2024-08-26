import assert from "node:assert/strict";

function pass(): void {
  assert.equal(1, 1);
}

export default pass;

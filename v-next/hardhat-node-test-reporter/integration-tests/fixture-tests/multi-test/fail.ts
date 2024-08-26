import assert from "node:assert/strict";

function fail(): void {
  assert.equal(1, 2);
}

export default fail;

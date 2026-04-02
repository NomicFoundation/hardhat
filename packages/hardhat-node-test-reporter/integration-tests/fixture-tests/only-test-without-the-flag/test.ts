import assert from "node:assert/strict";
import { describe, it, test } from "node:test";

test("test", async () => {
  assert.equal(1, 1);
});

// eslint-disable-next-line no-only-tests/no-only-tests -- testing test.only explicitly
test.only("test only", async () => {
  assert.equal(1, 2);
});

// eslint-disable-next-line no-only-tests/no-only-tests -- testing describe.only explicitly
describe.only("describe only", async () => {
  it("it", async () => {
    assert.equal(1, 2);
  });
});

describe("describe", async () => {
  // eslint-disable-next-line no-only-tests/no-only-tests -- testing it.only explicitly
  it.only("it only", async () => {
    assert.equal(1, 2);
  });

  it("it", async () => {
    assert.equal(1, 1);
  });
});

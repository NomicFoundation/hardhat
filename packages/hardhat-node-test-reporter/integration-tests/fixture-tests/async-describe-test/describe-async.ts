import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("describe.async", async () => {
  const one = await new Promise((resolve) => setTimeout(() => resolve(1), 0));

  it("describe.async.it", async () => {
    assert.equal(one, 1);
  });

  // eslint-disable-next-line no-only-tests/no-only-tests -- testing it.only explicitly
  it.only("describe.async.it.only", async () => {
    assert.equal(one, 1);
  });

  describe("describe.async.describe.async", async () => {
    const two = await new Promise((resolve) => setTimeout(() => resolve(2), 0));

    it("describe.async.describe.async.it", async () => {
      assert.equal(two, 2);
    });

    // eslint-disable-next-line no-only-tests/no-only-tests -- testing it.only explicitly
    it.only("describe.async.describe.async.it.only", async () => {
      assert.equal(two, 2);
    });
  });

  // eslint-disable-next-line no-only-tests/no-only-tests -- testing describe.only explicitly
  describe.only("describe.async.describe.only.async", async () => {
    const three = await new Promise((resolve) =>
      setTimeout(() => resolve(3), 0),
    );

    it("describe.describe.only.async.it", async () => {
      assert.equal(three, 3);
    });

    // eslint-disable-next-line no-only-tests/no-only-tests -- testing it.only explicitly
    it.only("describe.async.describe.only.async.it.only", async () => {
      assert.equal(three, 3);
    });
  });

  describe("describe.async.describe", () => {
    it("describe.async.describe.it", async () => {
      assert.equal(one, 1);
    });

    // eslint-disable-next-line no-only-tests/no-only-tests -- testing it.only explicitly
    it.only("describe.async.describe.it.only", async () => {
      assert.equal(one, 1);
    });
  });
});

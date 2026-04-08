import assert from "node:assert/strict";
import { describe, it } from "node:test";

// eslint-disable-next-line no-only-tests/no-only-tests -- testing describe.only explicitly
describe.only("describe.only.async", async () => {
  const one = await new Promise((resolve) => setTimeout(() => resolve(1), 0));

  it("describe.only.async.it", async () => {
    assert.equal(one, 1);
  });

  // eslint-disable-next-line no-only-tests/no-only-tests -- testing it.only explicitly
  it.only("describe.only.async.it.only", async () => {
    assert.equal(one, 1);
  });

  describe("describe.only.async.describe.async", async () => {
    const two = await new Promise((resolve) => setTimeout(() => resolve(2), 0));

    it("describe.only.async.describe.async.it", async () => {
      assert.equal(two, 2);
    });

    // eslint-disable-next-line no-only-tests/no-only-tests -- testing it.only explicitly
    it.only("describe.only.async.describe.async.it.only", async () => {
      assert.equal(two, 2);
    });
  });

  // eslint-disable-next-line no-only-tests/no-only-tests -- testing describe.only explicitly
  describe.only("describe.only.async.describe.only.async", async () => {
    const three = await new Promise((resolve) =>
      setTimeout(() => resolve(3), 0),
    );

    it("describe.only.describe.only.async.it", async () => {
      assert.equal(three, 3);
    });

    // eslint-disable-next-line no-only-tests/no-only-tests -- testing it.only explicitly
    it.only("describe.only.async.describe.only.async.it.only", async () => {
      assert.equal(three, 3);
    });
  });

  describe("describe.only.async.describe", () => {
    it("describe.only.async.describe.it", async () => {
      assert.equal(one, 1);
    });

    // eslint-disable-next-line no-only-tests/no-only-tests -- testing it.only explicitly
    it.only("describe.only.async.describe.it.only", async () => {
      assert.equal(one, 1);
    });
  });
});

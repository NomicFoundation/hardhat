import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expectTypeOf } from "expect-type";

import { bar, foo } from "../src/index.js";

describe("Example tests", () => {
  it("foo", function () {
    assert.equal(foo(), "foo");
  });

  it("bar", function () {
    assert.equal(bar(), "bar");
  });

  it("should return the right types", function () {
    expectTypeOf(foo()).toMatchTypeOf<string>();
  });
});

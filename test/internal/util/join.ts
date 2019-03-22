import { assert } from "chai";

import { join } from "../../../src/internal/util/join";

describe.only("join", () => {
  it("should join paths as expected", () => {
    assert.equal(join("a", "b", "c"), "a/b/c");
    assert.equal(join("a"), "a");
    assert.equal(join(".", "a"), "./a");
    assert.equal(join(".", "a", "b"), "./a/b");
    assert.equal(join(".", "a", "..", "b"), "./b");
    assert.equal(join(".", "..", "..", "a", "b"), "./../../a/b");
    assert.equal(join(".", "..", "..", "a", "..", "b"), "./../../b");
  });
});

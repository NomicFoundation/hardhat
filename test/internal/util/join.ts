import { assert } from "chai";
import { sep } from "path";

import { join } from "../../../src/internal/util/join";

describe.only("join", () => {
  function getPath(parts: string[]): string {
    return parts.reduce((currentPath, part) => currentPath + sep + part);
  }

  it("should join paths as expected", () => {
    assert.equal(join("a", "b", "c"), getPath(["a", "b", "c"]));
    assert.equal(join("a"), getPath(["a"]));
    assert.equal(join(".", "a"), getPath([".", "a"]));
    assert.equal(join(".", "a", "b"), getPath([".", "a", "b"]));
    assert.equal(join(".", "a", "..", "b"), getPath([".", "b"]));
    assert.equal(
      join(".", "..", "..", "a", "b"),
      getPath([".", "..", "..", "a", "b"])
    );
    assert.equal(
      join(".", "..", "..", "a", "..", "b"),
      getPath([".", "..", "..", "b"])
    );
  });
});

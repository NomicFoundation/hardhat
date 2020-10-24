import { assert } from "chai";

import { fromEntries } from "../../../src/internal/util/lang";

describe("From entries", () => {
  it("Should return an empty object if entries is an empty array", () => {
    assert.deepEqual(fromEntries([]), {});
  });

  it("Should construct an object", () => {
    const o = {};
    assert.deepEqual(
      fromEntries([
        ["a", 1],
        ["b", true],
        ["c", o],
      ]),
      {
        a: 1,
        b: true,
        c: o,
      }
    );
  });

  it("Should keep the last entry if there are multiple ones with the same key", () => {
    assert.deepEqual(
      fromEntries([
        ["a", 1],
        ["b", 2],
        ["a", 3],
      ]),
      {
        a: 3,
        b: 2,
      }
    );
  });
});

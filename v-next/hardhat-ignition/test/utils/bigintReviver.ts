import { assert } from "chai";

import { bigintReviver } from "../../src/utils/bigintReviver.js";

describe("bigintReviver", function () {
  it('should convert number strings ending with "n" to BigInt', function () {
    assert.deepEqual(JSON.parse('{"a":"1n"}', bigintReviver), { a: BigInt(1) });
  });

  it("should throw if a number is bigger than Number.MAX_SAFE_INTEGER", function () {
    assert.throws(() => {
      JSON.parse('{"a":9007199254740992}', bigintReviver);
    }, `Parameter "a" exceeds maximum safe integer size. Encode the value as a string using bigint notation: \`$\{value\}n\``);
  });

  it("should not convert regular numbers", function () {
    assert.deepEqual(JSON.parse('{"a":1}', bigintReviver), { a: 1 });
  });
});

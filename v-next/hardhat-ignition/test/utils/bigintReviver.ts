import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import { bigintReviver } from "../../src/internal/utils/bigintReviver.js";

describe("bigintReviver", function () {
  it('should convert number strings ending with "n" to BigInt', function () {
    assert.deepEqual(JSON.parse('{"a":"1n"}', bigintReviver), { a: BigInt(1) });
  });

  it("should throw if a number is bigger than Number.MAX_SAFE_INTEGER", function () {
    assertThrowsHardhatError(
      () => {
        JSON.parse('{"a":9007199254740992}', bigintReviver);
      },
      HardhatError.ERRORS.IGNITION.INTERNAL
        .PARAMETER_EXCEEDS_MAXIMUM_SAFE_INTEGER,
      {
        parameter: "a",
        value: 9007199254740992,
      },
    );
  });

  it("should not convert regular numbers", function () {
    assert.deepEqual(JSON.parse('{"a":1}', bigintReviver), { a: 1 });
  });
});

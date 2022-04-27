import { assert } from "chai";

import { assertValidAddress } from "../src/utils";

describe("assertValidAddress", function () {
  it("accepts a valid checksummed address", function () {
    assertValidAddress("0x9cEEA47Aa0452c0f2D5Dea8C4E9550ab9209A20b");
  });

  const invalidAddressExamples: Array<[string, string]> = [
    ["lowercase address", "0x9ceea47aa0452c0f2d5dea8c4e9550ab9209a20b"],
    ["non-checksummed address", "0x000000000000000000000000000000000000BEEf"],
    ["non-address hex string", "0xbeef"],
  ];

  for (const [type, value] of invalidAddressExamples) {
    it(`should not accept addresses of type ${type}`, function () {
      assert.throws(() => assertValidAddress(value));
    });
  }
});

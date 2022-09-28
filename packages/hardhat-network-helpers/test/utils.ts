import { assert } from "chai";

import { assertValidAddress } from "../src/utils";

describe("assertValidAddress", function () {
  it("accepts a valid checksummed address", function () {
    assertValidAddress("0x9cEEA47Aa0452c0f2D5Dea8C4E9550ab9209A20b");
  });

  it("accepts an all lowercase address", function () {
    assertValidAddress("0xaaaaaaa11111111111111bbbbb11111111111111");
    assertValidAddress("0x1234567890123456789012345678901234567890");
  });

  const invalidAddressExamples: Array<[string, string]> = [
    ["invalid checksum address", "0x000000000000000000000000000000000000BEEf"],
    ["non-address hex string", "0xbeef"],
  ];

  for (const [type, value] of invalidAddressExamples) {
    it(`should not accept addresses of type ${type}`, function () {
      assert.throws(() => assertValidAddress(value));
    });
  }
});

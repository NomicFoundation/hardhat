import { AssertionError, expect } from "chai";

import "../src/internal/add-chai-matchers";

describe("properHex", function () {
  it("should handle a successful positive case", function () {
    expect("0xAB").to.be.properHex(2);
  });

  it("should handle a successful negative case", function () {
    expect("0xab").to.not.be.properHex(3);
  });

  it("should handle a positive case failing because of an invalid length", function () {
    const input = "0xABCDEF";
    const length = 99;
    expect(() => expect(input).to.be.properHex(length)).to.throw(
      AssertionError,
      `Expected "${input}" to be a hex string of length ${
        length + 2
      } (the provided ${length} plus 2 more for the "0x" prefix), but its length is ${
        input.length
      }`
    );
  });

  it("should handle a positive case failing because of an invalid hex value", function () {
    expect(() => expect("0xABCDEFG").to.be.properHex(8)).to.throw(
      AssertionError,
      'Expected "0xABCDEFG" to be a proper hex string, but it contains invalid (non-hex) characters'
    );
  });

  it("should handle a negative case failing because of a valid length", function () {
    const input = "0xab";
    const length = 2;
    expect(() => expect(input).to.not.be.properHex(length)).to.throw(
      AssertionError,
      `Expected "${input}" NOT to be a hex string of length ${
        length + 2
      } (the provided ${length} plus 2 more for the "0x" prefix), but its length is ${
        input.length
      }`
    );
  });

  it("should handle a negative case failing because of an invalid hex value", function () {
    const input = "0xabcdefg";
    expect(() => expect(input).to.not.be.properHex(8)).to.throw(
      AssertionError,
      `Expected "${input}" NOT to be a proper hex string, but it contains only valid hex characters`
    );
  });
});

import { describe, it } from "node:test";

import { AssertionError, expect } from "chai";

import { addChaiMatchers } from "../../src/internal/add-chai-matchers.js";

addChaiMatchers();

describe("UNIT: hexEqual", () => {
  it("0xAB equals 0xab", () => {
    expect("0xAB").to.hexEqual("0xab");
  });

  it("0xAB does not equal 0xabc", () => {
    expect("0xAB").to.not.hexEqual("0xabc");
  });

  it("0x0010ab equals 0x000010ab", () => {
    expect("0x0010ab").to.hexEqual("0x000010ab");
  });

  it("0x0000010AB does not equal 0x0010abc", () => {
    expect("0x0000010AB").to.not.hexEqual("0x0010abc");
  });

  it("0x edge case", () => {
    expect("0x").to.hexEqual("0x000000");
  });

  it("abc is not a hex string", () => {
    expect(() => expect("abc").to.hexEqual("0xabc")).to.throw(
      AssertionError,
      'Expected "abc" to be a hex string equal to "0xabc", but "abc" is not a valid hex string',
    );
    expect(() => expect("0xabc").to.hexEqual("abc")).to.throw(
      AssertionError,
      'Expected "0xabc" to be a hex string equal to "abc", but "abc" is not a valid hex string',
    );
    expect(() => expect("abc").to.not.hexEqual("0xabc")).to.throw(
      AssertionError,
      'Expected "abc" not to be a hex string equal to "0xabc", but "abc" is not a valid hex string',
    );
    expect(() => expect("0xabc").to.not.hexEqual("abc")).to.throw(
      AssertionError,
      'Expected "0xabc" not to be a hex string equal to "abc", but "abc" is not a valid hex string',
    );
  });

  it("xyz is not a hex string", () => {
    expect(() => expect("xyz").to.hexEqual("0x1A4")).to.throw(
      AssertionError,
      'Expected "xyz" to be a hex string equal to "0x1A4", but "xyz" is not a valid hex string',
    );
  });

  it("0xyz is not a hex string", () => {
    expect(() => expect("0xyz").to.hexEqual("0x1A4")).to.throw(
      AssertionError,
      'Expected "0xyz" to be a hex string equal to "0x1A4", but "0xyz" is not a valid hex string',
    );
  });

  it("empty string is not a hex string", () => {
    expect(() => expect("").to.hexEqual("0x0")).to.throw(
      AssertionError,
      'Expected "" to be a hex string equal to "0x0", but "" is not a valid hex string',
    );
  });

  it("correct error when strings are not equal", async () => {
    expect(() => expect("0xa").to.hexEqual("0xb")).to.throw(
      AssertionError,
      'Expected "0xa" to be a hex string equal to "0xb"',
    );
  });

  it("correct error when strings are equal but expected not to", async () => {
    expect(() => expect("0xa").not.to.hexEqual("0xa")).to.throw(
      AssertionError,
      'Expected "0xa" NOT to be a hex string equal to "0xa", but it was',
    );
  });
});

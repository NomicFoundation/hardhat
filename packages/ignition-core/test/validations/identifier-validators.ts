import { assert } from "chai";
import { describe, it } from "node:test";

import { isValidFunctionOrEventName } from "../../src/internal/utils/identifier-validators.js";

describe("isValidFunctionOrEventName", () => {
  it("should return true for valid solidity function names", () => {
    assert.equal(isValidFunctionOrEventName("a"), true);
    assert.equal(isValidFunctionOrEventName("aa"), true);
    assert.equal(isValidFunctionOrEventName("a1"), true);
    assert.equal(isValidFunctionOrEventName("myFunction"), true);
    assert.equal(isValidFunctionOrEventName("myFunction()"), true);
    assert.equal(isValidFunctionOrEventName("myFunction123()"), true);
    assert.equal(isValidFunctionOrEventName("myFunction(uint256)"), true);
    assert.equal(isValidFunctionOrEventName("myFunction(uint256)"), true);
    assert.equal(isValidFunctionOrEventName("myFunction(uint256,bool)"), true);
    assert.equal(isValidFunctionOrEventName("myFunction(uint256[])"), true);
    assert.equal(
      isValidFunctionOrEventName("myFunction(uint256[],bool)"),
      true,
    );
  });

  it("should return false for invalid solidity function names", () => {
    assert.equal(isValidFunctionOrEventName("1"), false);
    assert.equal(isValidFunctionOrEventName("11"), false);
    assert.equal(isValidFunctionOrEventName("123myFunction"), false);
    assert.equal(isValidFunctionOrEventName("myFunction("), false);
    assert.equal(isValidFunctionOrEventName("myFunction(uint)256"), false);
    assert.equal(isValidFunctionOrEventName("myFunction(uint256"), false);
    assert.equal(isValidFunctionOrEventName("myFunctionuint256)"), false);
    assert.equal(isValidFunctionOrEventName("(uint256)"), false);
    assert.equal(isValidFunctionOrEventName("123(uint256)"), false);
  });
});

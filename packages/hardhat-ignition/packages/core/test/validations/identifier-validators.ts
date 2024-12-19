import { assert } from "chai";

import { isValidFunctionOrEventName } from "../../src/internal/utils/identifier-validators";

describe("isValidFunctionOrEventName", () => {
  it("should return true for valid solidity function names", () => {
    assert.isTrue(isValidFunctionOrEventName("a"));
    assert.isTrue(isValidFunctionOrEventName("aa"));
    assert.isTrue(isValidFunctionOrEventName("a1"));
    assert.isTrue(isValidFunctionOrEventName("myFunction"));
    assert.isTrue(isValidFunctionOrEventName("myFunction()"));
    assert.isTrue(isValidFunctionOrEventName("myFunction123()"));
    assert.isTrue(isValidFunctionOrEventName("myFunction(uint256)"));
    assert.isTrue(isValidFunctionOrEventName("myFunction(uint256)"));
    assert.isTrue(isValidFunctionOrEventName("myFunction(uint256,bool)"));
    assert.isTrue(isValidFunctionOrEventName("myFunction(uint256[])"));
    assert.isTrue(isValidFunctionOrEventName("myFunction(uint256[],bool)"));
  });

  it("should return false for invalid solidity function names", () => {
    assert.isFalse(isValidFunctionOrEventName("1"));
    assert.isFalse(isValidFunctionOrEventName("11"));
    assert.isFalse(isValidFunctionOrEventName("123myFunction"));
    assert.isFalse(isValidFunctionOrEventName("myFunction("));
    assert.isFalse(isValidFunctionOrEventName("myFunction(uint)256"));
    assert.isFalse(isValidFunctionOrEventName("myFunction(uint256"));
    assert.isFalse(isValidFunctionOrEventName("myFunctionuint256)"));
    assert.isFalse(isValidFunctionOrEventName("(uint256)"));
    assert.isFalse(isValidFunctionOrEventName("123(uint256)"));
  });
});

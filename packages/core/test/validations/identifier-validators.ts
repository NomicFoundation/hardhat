import { assert } from "chai";

import { isValidFunctionOrEventName } from "../../src/internal/utils/identifier-validators";

describe("isValidFunctionOrEventName", () => {
  it("should return true for valid solidity function names", () => {
    assert.isTrue(isValidFunctionOrEventName("myFunction"));
    assert.isTrue(isValidFunctionOrEventName("myFunction()"));
    assert.isTrue(isValidFunctionOrEventName("myFunction(uint256)"));
    assert.isTrue(isValidFunctionOrEventName("myFunction(uint256)"));
    assert.isTrue(isValidFunctionOrEventName("myFunction(uint256,bool)"));
    assert.isTrue(isValidFunctionOrEventName("myFunction(uint256[],bool)"));
  });

  it("should return false for invalid solidity function names", () => {
    assert.isFalse(isValidFunctionOrEventName("myFunction("));
    assert.isFalse(isValidFunctionOrEventName("myFunction(uint)256"));
    assert.isFalse(isValidFunctionOrEventName("myFunction(uint256"));
    assert.isFalse(isValidFunctionOrEventName("myFunctionuint256)"));
    assert.isFalse(isValidFunctionOrEventName("(uint256)"));
  });
});

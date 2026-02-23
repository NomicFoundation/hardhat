import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { getCallerRelativePath } from "../../src/internal/using-hardhat2-plugin-errors.js";

// When calling getCallerRelativePath directly:
// 0=message, 1=getCallerRelativePath, 2=actual caller
const DIRECT_CALL_DEPTH = 2;

describe("getCallerRelativePath", () => {
  it("should return a path containing this test file", () => {
    const result = getCallerRelativePath(DIRECT_CALL_DEPTH);
    assert(result !== undefined, "Result should not be undefined");
    assert.ok(
      result.includes(
        path.join("test", "internal", "hardhat2-plugin-errors.ts"),
      ),
      `Expected path to contain the path of "test/internal/hardhat2-plugin-errors.ts", got "${result}"`,
    );
  });

  it("should return a relative path starting with ." + path.sep, () => {
    const result = getCallerRelativePath(DIRECT_CALL_DEPTH);
    assert(result !== undefined, "Result should not be undefined");
    assert.ok(
      result.startsWith("." + path.sep),
      `Expected path to start with ".${path.sep}", got "${result}"`,
    );
  });

  it("should return undefined when depth exceeds available stack frames", () => {
    const result = getCallerRelativePath(999);
    assert.equal(result, undefined);
  });

  it("should resolve the correct caller at different depths", () => {
    function wrapper() {
      // From inside wrapper: 0=message, 1=getCallerRelativePath, 2=wrapper, 3=actual caller
      return getCallerRelativePath(2);
    }
    const result = wrapper();
    assert(result !== undefined, "Result should not be undefined");
    assert.ok(
      result.includes(
        path.join("test", "internal", "hardhat2-plugin-errors.ts"),
      ),
      `Expected path to contain the path of "test/internal/hardhat2-plugin-errors.ts", got "${result}"`,
    );
  });
});

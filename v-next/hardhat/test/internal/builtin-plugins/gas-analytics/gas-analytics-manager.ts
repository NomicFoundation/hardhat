import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  avg,
  median,
  getUserFqn,
  getFunctionName,
  findDuplicates,
  roundTo,
} from "../../../../src/internal/builtin-plugins/gas-analytics/gas-analytics-manager.js";

describe("gas-analytics-manager", () => {
  describe("helpers", () => {
    describe("avg", () => {
      it("should calculate average of numbers", () => {
        assert.equal(avg([1, 2, 3, 4, 5]), 3);
        assert.equal(avg([10, 20, 30]), 20);
        assert.equal(avg([1]), 1);
        assert.equal(avg([0, 0, 0]), 0);
        assert.equal(avg([5.5, 2.5]), 4);
      });
    });

    describe("median", () => {
      it("should calculate median for odd length arrays", () => {
        assert.equal(median([1, 2, 3]), 2);
        assert.equal(median([5, 1, 3]), 3);
        assert.equal(median([1]), 1);
      });

      it("should calculate median for even length arrays", () => {
        assert.equal(median([1, 2]), 1.5);
        assert.equal(median([1, 2, 3, 4]), 2.5);
        assert.equal(median([10, 20, 30, 40]), 25);
      });

      it("should handle unsorted arrays", () => {
        assert.equal(median([3, 1, 2]), 2);
        assert.equal(median([4, 1, 3, 2]), 2.5);
      });
    });

    describe("getUserFqn", () => {
      it("should remove project/ prefix", () => {
        assert.equal(
          getUserFqn("project/contracts/MyContract.sol"),
          "contracts/MyContract.sol",
        );
        assert.equal(getUserFqn("project/test.sol"), "test.sol");
      });

      it("should handle npm packages", () => {
        assert.equal(
          getUserFqn("npm/package@1.0.0/Contract.sol"),
          "package/Contract.sol",
        );
        assert.equal(
          getUserFqn("npm/@scope/package@1.0.0/Contract.sol"),
          "@scope/package/Contract.sol",
        );
      });

      it("should handle npm packages without version match", () => {
        assert.equal(getUserFqn("npm/invalid-format"), "invalid-format");
      });

      it("should return input as-is for other formats", () => {
        assert.equal(getUserFqn("other/format"), "other/format");
        assert.equal(getUserFqn("simple"), "simple");
      });
    });

    describe("getFunctionName", () => {
      it("should extract function name from signature", () => {
        assert.equal(getFunctionName("transfer(address,uint256)"), "transfer");
        assert.equal(getFunctionName("balanceOf(address)"), "balanceOf");
        assert.equal(getFunctionName("approve(address,uint256)"), "approve");
      });

      it("should handle functions without parameters", () => {
        assert.equal(getFunctionName("totalSupply()"), "totalSupply");
      });

      it("should handle simple names without parentheses", () => {
        assert.equal(getFunctionName("simple"), "simple");
      });
    });

    describe("findDuplicates", () => {
      it("should find duplicate strings", () => {
        const result = findDuplicates(["a", "b", "a", "c", "b"]);
        assert.deepEqual(result.sort(), ["a", "b"]);
      });

      it("should find duplicate numbers", () => {
        const result = findDuplicates([1, 2, 1, 3, 2]);
        assert.deepEqual(result.sort(), [1, 2]);
      });

      it("should return empty array when no duplicates", () => {
        assert.deepEqual(findDuplicates(["a", "b", "c"]), []);
        assert.deepEqual(findDuplicates([1, 2, 3]), []);
      });

      it("should handle empty array", () => {
        assert.deepEqual(findDuplicates([]), []);
      });

      it("should handle single element", () => {
        assert.deepEqual(findDuplicates(["a"]), []);
      });
    });

    describe("roundTo", () => {
      it("should round to specified decimal places", () => {
        assert.equal(roundTo(3.14159, 2), 3.14);
        assert.equal(roundTo(3.14159, 3), 3.142);
        assert.equal(roundTo(3.14159, 0), 3);
      });

      it("should handle rounding up", () => {
        assert.equal(roundTo(3.156, 2), 3.16);
        assert.equal(roundTo(3.999, 2), 4);
      });

      it("should handle negative numbers", () => {
        assert.equal(roundTo(-3.14159, 2), -3.14);
        assert.equal(roundTo(-3.156, 2), -3.16);
      });

      it("should handle zero", () => {
        assert.equal(roundTo(0, 2), 0);
      });
    });
  });
});

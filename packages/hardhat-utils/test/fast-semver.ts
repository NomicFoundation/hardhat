import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compare,
  equals,
  greaterThan,
  greaterThanOrEqual,
  lowerThan,
  lowerThanOrEqual,
  parseVersion,
  type SemverVersion,
} from "../src/fast-semver.js";

describe("fast-semver", () => {
  describe("parseVersion", () => {
    it("Should parse a strict x.y.z version", () => {
      assert.deepEqual(parseVersion("0.0.0"), [0, 0, 0]);
      assert.deepEqual(parseVersion("1.2.3"), [1, 2, 3]);
      assert.deepEqual(parseVersion("10.20.30"), [10, 20, 30]);
    });

    it("Should strip a +build suffix", () => {
      assert.deepEqual(parseVersion("0.8.31+commit.7eddb6a8"), [0, 8, 31]);
      assert.deepEqual(parseVersion("1.2.3+build.1"), [1, 2, 3]);
    });

    it("Should reject prerelease versions", () => {
      assert.equal(parseVersion("1.2.3-rc.1"), undefined);
      assert.equal(parseVersion("1.2.3-alpha"), undefined);
      assert.equal(parseVersion("1.2.3-0"), undefined);
    });

    it("Should reject invalid inputs", () => {
      assert.equal(parseVersion("v1.2.3"), undefined);
      assert.equal(parseVersion("1.2"), undefined);
      assert.equal(parseVersion(""), undefined);
      assert.equal(parseVersion("1.2.3.4"), undefined);
      assert.equal(parseVersion("1.2.x"), undefined);
      assert.equal(parseVersion("a.b.c"), undefined);
      assert.equal(parseVersion(" 1.2.3"), undefined);
      assert.equal(parseVersion("1.2.3 "), undefined);
    });
  });

  describe("compare", () => {
    it("Should produce a total order over a fixture array", () => {
      const versions: SemverVersion[] = [
        [0, 8, 31],
        [0, 4, 7],
        [1, 0, 0],
        [0, 8, 22],
        [0, 5, 0],
        [0, 8, 22],
        [10, 0, 0],
        [2, 1, 1],
      ];

      const sorted = [...versions].sort(compare);

      assert.deepEqual(sorted, [
        [0, 4, 7],
        [0, 5, 0],
        [0, 8, 22],
        [0, 8, 22],
        [0, 8, 31],
        [1, 0, 0],
        [2, 1, 1],
        [10, 0, 0],
      ]);
    });

    it("Should return zero for equal versions", () => {
      assert.equal(compare([1, 2, 3], [1, 2, 3]), 0);
    });

    it("Should compare major before minor before patch", () => {
      assert.ok(
        compare([2, 0, 0], [1, 99, 99]) > 0,
        "major should dominate minor and patch",
      );
      assert.ok(
        compare([1, 2, 0], [1, 1, 99]) > 0,
        "minor should dominate patch",
      );
      assert.ok(compare([1, 1, 2], [1, 1, 1]) > 0, "patch should be compared");
    });
  });

  describe("equals", () => {
    it("Should return true for identical versions", () => {
      assert.equal(equals([1, 2, 3], [1, 2, 3]), true);
      assert.equal(equals([0, 0, 0], [0, 0, 0]), true);
    });

    it("Should return false when any component differs", () => {
      assert.equal(equals([1, 2, 3], [2, 2, 3]), false);
      assert.equal(equals([1, 2, 3], [1, 3, 3]), false);
      assert.equal(equals([1, 2, 3], [1, 2, 4]), false);
    });
  });

  describe("lowerThan", () => {
    it("Should return true only when strictly lower", () => {
      assert.equal(lowerThan([1, 2, 3], [1, 2, 4]), true);
      assert.equal(lowerThan([1, 2, 3], [1, 2, 3]), false);
      assert.equal(lowerThan([1, 2, 4], [1, 2, 3]), false);
    });
  });

  describe("lowerThanOrEqual", () => {
    it("Should return true when lower or equal", () => {
      assert.equal(lowerThanOrEqual([1, 2, 3], [1, 2, 4]), true);
      assert.equal(lowerThanOrEqual([1, 2, 3], [1, 2, 3]), true);
      assert.equal(lowerThanOrEqual([1, 2, 4], [1, 2, 3]), false);
    });
  });

  describe("greaterThan", () => {
    it("Should return true only when strictly greater", () => {
      assert.equal(greaterThan([1, 2, 4], [1, 2, 3]), true);
      assert.equal(greaterThan([1, 2, 3], [1, 2, 3]), false);
      assert.equal(greaterThan([1, 2, 3], [1, 2, 4]), false);
    });
  });

  describe("greaterThanOrEqual", () => {
    it("Should return true when greater or equal", () => {
      assert.equal(greaterThanOrEqual([1, 2, 4], [1, 2, 3]), true);
      assert.equal(greaterThanOrEqual([1, 2, 3], [1, 2, 3]), true);
      assert.equal(greaterThanOrEqual([1, 2, 3], [1, 2, 4]), false);
    });
  });
});

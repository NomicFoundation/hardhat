import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildConfigOverride,
  resolveFunctionSelector,
} from "../../../../../src/internal/builtin-plugins/solidity-test/inline-config/index.js";

import { makeRawOverride } from "./mocks.js";

describe("inline-config - helpers", () => {
  describe("resolveFunctionSelector", () => {
    it("should return 0x-prefixed selector for matching function", () => {
      assert.equal(
        resolveFunctionSelector({ "testFuzz()": "deadbeef" }, "testFuzz"),
        "0xdeadbeef",
      );
    });

    it("should match parameterized function signatures", () => {
      assert.equal(
        resolveFunctionSelector(
          { "testFuzz(uint256)": "12345678" },
          "testFuzz",
        ),
        "0x12345678",
      );
    });

    it("should return undefined when no match exists", () => {
      assert.equal(resolveFunctionSelector({}, "testHelper"), undefined);
    });
  });

  describe("buildConfigOverride", () => {
    it("should build fuzz section from dotted key", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({ key: "fuzz.runs", rawValue: "50" }),
        ]),
        { fuzz: { runs: 50 } },
      );
    });

    it("should build invariant section from dotted key", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({ key: "invariant.depth", rawValue: "20" }),
        ]),
        { invariant: { depth: 20 } },
      );
    });

    it("should place top-level keys at root", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({
            key: "allowInternalExpectRevert",
            rawValue: "true",
          }),
        ]),
        { allowInternalExpectRevert: true },
      );
    });

    it("should map fuzz.timeout to { time: N }", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({ key: "fuzz.timeout", rawValue: "30" }),
        ]),
        { fuzz: { timeout: { time: 30 } } },
      );
    });

    it("should map invariant.timeout to { time: N }", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({ key: "invariant.timeout", rawValue: "60" }),
        ]),
        { invariant: { timeout: { time: 60 } } },
      );
    });

    it("should combine multiple keys into one config", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({ key: "fuzz.runs", rawValue: "10" }),
          makeRawOverride({ key: "fuzz.maxTestRejects", rawValue: "500" }),
        ]),
        { fuzz: { runs: 10, maxTestRejects: 500 } },
      );
    });

    it("should parse boolean false correctly", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({ key: "fuzz.showLogs", rawValue: "false" }),
        ]),
        { fuzz: { showLogs: false } },
      );
    });
  });
});

import type {
  SolidityStackTraceEntry,
  StackTraceEntryType,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/stack-traces/solidity-stack-trace.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SolidityCallSite } from "../../../../../../src/internal/builtin-plugins/network-manager/edr/stack-traces/stack-trace-solidity-errors.js";

describe("SolidityCallSite", function () {
  describe("toString", function () {
    it("works when no properties are present", async () => {
      const callSite = new SolidityCallSite(
        undefined,
        undefined,
        undefined,
        undefined,
      );

      assert.equal(callSite.toString(), "null.<anonymous> (unknown)");
    });

    it("works when only the sourcename and the line number are present", async () => {
      const callSite = new SolidityCallSite(
        "Source.sol",
        undefined,
        undefined,
        1,
      );

      assert.equal(callSite.toString(), "null.<anonymous> (Source.sol:1)");
    });

    it("works when all properties are present", async () => {
      const callSite = new SolidityCallSite(
        "Source.sol",
        "Contract",
        "functionName",
        1,
      );

      assert.equal(callSite.toString(), "Contract.functionName (Source.sol:1)");
    });

    it("exhaustive stack trace entries", async () => {
      // This is a type-only test to ensure that the SolidityStackTraceEntry union type
      // includes all the expected variants.
      const hhEntryType = (_entryType: SolidityStackTraceEntry["type"]) => {};
      const edrEntryType = (_entryType: StackTraceEntryType) => {};

      const _test1 = (entryType: SolidityStackTraceEntry["type"]) => {
        edrEntryType(entryType);
      };
      const _test2 = (entryType: StackTraceEntryType) => {
        hhEntryType(entryType);
      };
    });
  });
});

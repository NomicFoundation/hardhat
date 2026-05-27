import type { SolidityStackTraceEntry } from "../../../../../../src/internal/builtin-plugins/network-manager/edr/stack-traces/solidity-stack-trace.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CheatcodeErrorCode,
  ContractFunctionType,
  StackTraceEntryType,
} from "@nomicfoundation/edr";

import {
  createSolidityErrorWithStackTrace,
  encodeStackTraceEntry,
  SolidityCallSite,
  SolidityError,
} from "../../../../../../src/internal/builtin-plugins/network-manager/edr/stack-traces/stack-trace-solidity-errors.js";

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

describe("createSolidityErrorWithStackTrace", () => {
  const dummySourceReference = {
    sourceName: "Test.t.sol",
    sourceContent: "",
    line: 1,
    range: [0, 0],
  };

  describe("CHEATCODE_ERROR", () => {
    it("returns the raw message when details is undefined", () => {
      const entry: SolidityStackTraceEntry = {
        type: StackTraceEntryType.CHEATCODE_ERROR,
        message: "cheatcode 'broadcast(address)' is not supported",
        sourceReference: dummySourceReference,
      };

      const error = createSolidityErrorWithStackTrace(
        "fallback",
        [entry],
        "0x",
      );
      assert.equal(
        error.message,
        "VM Exception while processing transaction: cheatcode 'broadcast(address)' is not supported",
      );
    });

    it("returns a Hardhat-specific message for unsupported cheatcodes", () => {
      const entry: SolidityStackTraceEntry = {
        type: StackTraceEntryType.CHEATCODE_ERROR,
        message: "cheatcode 'broadcast(address)' is not supported",
        sourceReference: dummySourceReference,
        details: {
          code: CheatcodeErrorCode.UnsupportedCheatcode,
          cheatcode: "broadcast(address)",
        },
      };

      const error = createSolidityErrorWithStackTrace(
        "fallback",
        [entry],
        "0x",
      );
      assert.equal(
        error.message,
        "VM Exception while processing transaction: Cheatcode 'broadcast(address)' is not supported by Hardhat.",
      );
    });

    it("returns a Hardhat-specific message for missing cheatcodes", () => {
      const entry: SolidityStackTraceEntry = {
        type: StackTraceEntryType.CHEATCODE_ERROR,
        message: "unknown cheatcode with selector '0x12345678'",
        sourceReference: dummySourceReference,
        details: {
          code: CheatcodeErrorCode.MissingCheatcode,
          cheatcode: "someNewCheatcode(uint256)",
        },
      };

      const error = createSolidityErrorWithStackTrace(
        "fallback",
        [entry],
        "0x",
      );
      assert.equal(
        error.message,
        "VM Exception while processing transaction: Cheatcode 'someNewCheatcode(uint256)' is not yet available in this version of Hardhat.",
      );
    });
  });

  describe("solidityStack", () => {
    it("encodes a single stack-trace entry", () => {
      const entry: SolidityStackTraceEntry = {
        type: StackTraceEntryType.CHEATCODE_ERROR,
        message: "boom",
        sourceReference: {
          sourceName: "Test.t.sol",
          sourceContent: "",
          contract: "TestContract",
          function: "testFn",
          line: 42,
          range: [0, 0],
        },
      };

      const error = createSolidityErrorWithStackTrace(
        "fallback",
        [entry],
        "0x",
      );

      assert.equal(
        error.solidityStack,
        encodeStackTraceEntry(entry).toString(),
      );
    });

    it("joins multiple entries with a newline, in stack order", () => {
      const entryA: SolidityStackTraceEntry = {
        type: StackTraceEntryType.CALLSTACK_ENTRY,
        sourceReference: {
          sourceName: "A.sol",
          sourceContent: "",
          contract: "A",
          function: "a",
          line: 1,
          range: [0, 0],
        },
        functionType: ContractFunctionType.FUNCTION,
      };
      const entryB: SolidityStackTraceEntry = {
        type: StackTraceEntryType.CHEATCODE_ERROR,
        message: "boom",
        sourceReference: {
          sourceName: "B.sol",
          sourceContent: "",
          contract: "B",
          function: "b",
          line: 2,
          range: [0, 0],
        },
      };

      const error = createSolidityErrorWithStackTrace(
        "fallback",
        [entryA, entryB],
        "0x",
      );

      const expected = [
        encodeStackTraceEntry(entryA).toString(),
        encodeStackTraceEntry(entryB).toString(),
      ].join("\n");
      assert.equal(error.solidityStack, expected);
    });

    it("uses the fallback string when the stack trace is empty", () => {
      const error = new SolidityError("msg", [], "0x");
      assert.equal(
        error.solidityStack,
        "Internal error when encoding SolidityError",
      );
    });

    it("exposes solidityStack as a string property", () => {
      const entry: SolidityStackTraceEntry = {
        type: StackTraceEntryType.CHEATCODE_ERROR,
        message: "boom",
        sourceReference: dummySourceReference,
      };
      const error = createSolidityErrorWithStackTrace(
        "fallback",
        [entry],
        "0x",
      );
      assert.equal(typeof error.solidityStack, "string");
    });
  });
});

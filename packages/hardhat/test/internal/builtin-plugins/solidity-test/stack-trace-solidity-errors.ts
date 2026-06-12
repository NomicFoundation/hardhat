import type { SolidityStackTraceEntry } from "../../../../src/internal/builtin-plugins/network-manager/edr/stack-traces/solidity-stack-trace.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CheatcodeErrorCode, StackTraceEntryType } from "@nomicfoundation/edr";

import { getMessageFromLastStackTraceEntry } from "../../../../src/internal/builtin-plugins/solidity-test/stack-trace-solidity-errors.js";

describe("getMessageFromLastStackTraceEntry", () => {
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

      assert.equal(
        getMessageFromLastStackTraceEntry(entry),
        "cheatcode 'broadcast(address)' is not supported",
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

      assert.equal(
        getMessageFromLastStackTraceEntry(entry),
        "Cheatcode 'broadcast(address)' is not supported by Hardhat.",
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

      assert.equal(
        getMessageFromLastStackTraceEntry(entry),
        "Cheatcode 'someNewCheatcode(uint256)' is not yet available in this version of Hardhat.",
      );
    });

    it("appends a suggestion for unsupported cheatcodes with known alternatives", () => {
      const entry: SolidityStackTraceEntry = {
        type: StackTraceEntryType.CHEATCODE_ERROR,
        message: "cheatcode 'eip712HashType(string,string)' is not supported",
        sourceReference: dummySourceReference,
        details: {
          code: CheatcodeErrorCode.UnsupportedCheatcode,
          cheatcode: "eip712HashType(string,string)",
        },
      };

      assert.equal(
        getMessageFromLastStackTraceEntry(entry),
        "Cheatcode 'eip712HashType(string,string)' is not supported by Hardhat. Providing a path to a bindings file is not supported, please use the eip712HashType(string calldata typeNameOrDefinition) cheatcode instead. See https://hardhat.org/docs/reference/cheatcodes/utilities/eip712-hash-type for more information.",
      );
    });
  });
});

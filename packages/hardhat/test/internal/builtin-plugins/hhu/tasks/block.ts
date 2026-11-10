import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { parseBlockArgument } from "../../../../../src/internal/builtin-plugins/hhu/tasks/block.js";

const HASH = `0x${"ab".repeat(32)}`;

describe("parseBlockArgument", () => {
  it("returns the block tags as they are", () => {
    for (const tag of ["latest", "pending", "earliest", "safe", "finalized"]) {
      assert.equal(parseBlockArgument(tag, "block"), tag);
    }
  });

  it("returns decimal and hex numbers as hex quantities", () => {
    assert.equal(parseBlockArgument("0", "block"), "0x0");
    assert.equal(parseBlockArgument("1234", "block"), "0x4d2");
    assert.equal(parseBlockArgument("0x04D2", "block"), "0x4d2");
  });

  it("returns a block hash as an EIP-1898 object", () => {
    assert.deepEqual(parseBlockArgument(HASH, "block"), { blockHash: HASH });
  });

  it("lowercases a block hash, as some nodes reject a 0X prefix", () => {
    assert.deepEqual(parseBlockArgument(`0X${"AB".repeat(32)}`, "block"), {
      blockHash: HASH,
    });
  });

  it("throws if the value isn't a tag, a number nor a hash", () => {
    for (const value of ["", "Latest", "-1", "1.5", "0x", "0xzz", "1e3"]) {
      assertThrowsHardhatError(
        () => parseBlockArgument(value, "block"),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value,
          name: "block",
          reason:
            "it must be a block number, a block hash, or one of latest, pending, earliest, safe and finalized",
        },
      );
    }
  });
});

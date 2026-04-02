import type { NetworkHelpers, BlockTag, NumberLike } from "../../src/types.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { initializeNetwork } from "../helpers/helpers.js";

describe("network-helpers - getStorageAt", () => {
  let networkHelpers: NetworkHelpers;

  const account = "0x000000000000000000000000000000000000bEEF";
  const code =
    "0x000000000000000000000000000000000000000000000000000000000000beef";

  before(async () => {
    ({ networkHelpers } = await initializeNetwork());
  });

  it("should get the storage of a given address", async () => {
    await networkHelpers.setStorageAt(account, "0x1", code);

    assert.equal(await networkHelpers.getStorageAt(account, "0x1"), code);
  });

  describe("accepted parameter types for index", () => {
    const indexExamples: Array<[string, NumberLike, number]> = [
      ["number", 1, 1],
      ["bigint", BigInt(1), 1],
      ["hex encoded", "0x1", 1],
      ["hex encoded with leading zeros", "0x01", 1],
    ];

    for (const [type, value, expectedIndex] of indexExamples) {
      it(`should accept index of type ${type}`, async () => {
        await networkHelpers.setStorageAt(account, value, code);

        assert.equal(
          await networkHelpers.getStorageAt(account, expectedIndex),
          code,
        );
      });
    }
  });

  describe("accepted parameter types for block", () => {
    const blockExamples: Array<[string, NumberLike | BlockTag]> = [
      ["number", 1],
      ["bigint", BigInt(1)],
      ["hex encoded", "0x1"],
      ["hex encoded with leading zeros", "0x01"],
      ["block tag latest", "latest"],
      ["block tag earliest", "earliest"],
      ["block tag pending", "pending"],
    ];

    for (const [type, value] of blockExamples) {
      it(`should accept block of type ${type}`, async () => {
        await networkHelpers.setStorageAt(account, 1, code);
        await networkHelpers.mine();

        await networkHelpers.getStorageAt(account, 1, value);
      });
    }
  });

  it("should throw because the address is not valid", async () => {
    await assertRejectsWithHardhatError(
      async () => networkHelpers.getStorageAt("0xaa", "0x1", "0xbeef"),
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.INVALID_ADDRESS,
      {
        value: "0xaa",
      },
    );
  });
});

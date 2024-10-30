import type { NetworkHelpers, NumberLike } from "../../src/types.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { initializeNetwork } from "../helpers/helpers.js";

describe("network-helpers - setStorageAt", () => {
  let networkHelpers: NetworkHelpers;

  const account = "0x000000000000000000000000000000000000bEEF";
  const code =
    "0x000000000000000000000000000000000000000000000000000000000000beef";

  before(async () => {
    ({ networkHelpers } = await initializeNetwork());
  });

  it("should allow setting the data at a specific storage index of a given address", async () => {
    await networkHelpers.setStorageAt(account, "0x1", code);
    assert.equal(await networkHelpers.getStorageAt(account, "0x1"), code);
  });

  describe("accepted parameter types for index", () => {
    const indexExamples: Array<[string, NumberLike, number]> = [
      ["number", 1, 1],
      ["bigint", BigInt(1), 1],
      ["hex encoded", "0x1", 1],
      ["hex encoded with leading zeros", "0x01", 1],
      ["hex encoded with several leading zeros", "0x001", 1],
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

    it("should accept data that is not 64 bytes long", async () => {
      await networkHelpers.setStorageAt(account, "0x1", "0xbeef");
      assert.equal(await networkHelpers.getStorageAt(account, "0x1"), code);
    });
  });

  it("should throw because the address is not valid", async () => {
    await assertRejectsWithHardhatError(
      async () => networkHelpers.setStorageAt("0xaa", "0x1", "0xbeef"),
      HardhatError.ERRORS.NETWORK_HELPERS.INVALID_ADDRESS,
      {
        value: "0xaa",
      },
    );
  });
});

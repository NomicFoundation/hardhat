import type { Time, NumberLike } from "../../src/types.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { initializeNetwork } from "../helpers/helpers.js";

describe("time - increase", () => {
  let time: Time;

  before(async () => {
    const { networkHelpers } = await initializeNetwork();
    time = networkHelpers.time;
  });

  it("should mine a new block with the timestamp increased by a given number of seconds", async () => {
    const initialBlockNumber = await time.latestBlock();
    const initialTimestamp = await time.latest();

    const newTimestamp = initialTimestamp + 10000;
    const returnedTimestamp = await time.increase(10000);

    const endBlockNumber = await time.latestBlock();
    const endTimestamp = await time.latest();

    assert.equal(endBlockNumber, initialBlockNumber + 1);
    assert.equal(newTimestamp, endTimestamp);
    assert.equal(returnedTimestamp, endTimestamp);
    assert.equal(endTimestamp - initialTimestamp, 10000);
  });

  it("should throw if given zero number of seconds", async () => {
    // eslint-disable-next-line no-restricted-syntax -- only used in test to verify error not thrown by Hardhat
    await assert.rejects(async () => time.increase(0));
  });

  it("should throw if given a negative number of seconds", async () => {
    await assertRejectsWithHardhatError(
      async () => time.increase(-1),
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL
        .CANNOT_CONVERT_NEGATIVE_NUMBER_TO_RPC_QUANTITY,
      {
        value: -1,
      },
    );
  });

  describe("accepted parameter types for number of seconds", () => {
    const nonceExamples: Array<[string, NumberLike]> = [
      ["number", 100],
      ["bigint", BigInt(100)],
      ["hex encoded", "0x64"],
    ];

    for (const [type, value] of nonceExamples) {
      it(`should accept an argument of type ${type}`, async () => {
        const initialTimestamp = await time.latest();

        await time.increase(value);

        const endTimestamp = await time.latest();

        assert.equal(endTimestamp - initialTimestamp, 100);
      });
    }
  });

  describe("blocks with same timestamp", () => {
    before(async () => {
      const { networkHelpers } = await initializeNetwork({
        allowBlocksWithSameTimestamp: true,
      });
      time = networkHelpers.time;
    });

    it("should not throw if given zero number of seconds", async () => {
      const initialBlockNumber = await time.latestBlock();
      const initialTimestamp = await time.latest();

      const returnedTimestamp = await time.increase(0);

      const endBlockNumber = await time.latestBlock();
      const endTimestamp = await time.latest();

      assert.equal(endBlockNumber, initialBlockNumber + 1);
      assert.equal(returnedTimestamp, endTimestamp);
      assert.equal(endTimestamp, initialTimestamp);
    });

    it("should throw if given a negative number of seconds", async () => {
      await assertRejectsWithHardhatError(
        time.increase(-1),
        HardhatError.ERRORS.NETWORK_HELPERS.GENERAL
          .CANNOT_CONVERT_NEGATIVE_NUMBER_TO_RPC_QUANTITY,
        { value: -1 },
      );
    });
  });
});

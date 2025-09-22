import type { Time } from "../../src/types.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { assertRejects } from "@nomicfoundation/hardhat-test-utils";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { toBigInt } from "../../src/internal/conversion.js";
import { initializeNetwork } from "../helpers/helpers.js";

describe("time - increaseTo", () => {
  let time: Time;

  before(async () => {
    const { networkHelpers } = await initializeNetwork();
    time = networkHelpers.time;
  });

  it("should mine a new block with the given timestamp", async () => {
    const initialBlockNumber = await time.latestBlock();
    const initialTimestamp = await time.latest();

    const newTimestamp = initialTimestamp + 10000;
    await time.increaseTo(newTimestamp);

    const endBlockNumber = await time.latestBlock();
    const endTimestamp = await time.latest();

    assert.equal(endBlockNumber, initialBlockNumber + 1);
    assert.equal(newTimestamp, endTimestamp);
    assert.equal(endTimestamp - initialTimestamp, 10000);
  });

  it("should throw if given a timestamp that is equal to the current block timestamp", async () => {
    const initialTimestamp = await time.latest();

    // eslint-disable-next-line no-restricted-syntax -- only used in test to verify error not thrown by Hardhat
    await assert.rejects(async () => time.increaseTo(initialTimestamp));
  });

  it("should throw if given a timestamp that is less than the current block timestamp", async () => {
    const initialTimestamp = await time.latest();

    // eslint-disable-next-line no-restricted-syntax -- only used in test to verify error not thrown by Hardhat
    await assert.rejects(async () => time.increaseTo(initialTimestamp - 1));
  });

  describe("accepted parameter types for timestamp", () => {
    it("should accept an argument of type bigint", async () => {
      const initialTimestamp = await time.latest();
      const newTimestamp = initialTimestamp + 3600;

      await time.increaseTo(BigInt(newTimestamp));
      const endTimestamp = await time.latest();

      assert.equal(newTimestamp, endTimestamp);
      assert.equal(endTimestamp - initialTimestamp, 3600);
    });

    it("should accept an argument of type hex string", async () => {
      const initialTimestamp = await time.latest();
      const newTimestamp = initialTimestamp + 3600;

      await time.increaseTo(numberToHexString(await toBigInt(newTimestamp)));
      const endTimestamp = await time.latest();

      assert.equal(newTimestamp, endTimestamp);
      assert.equal(endTimestamp - initialTimestamp, 3600);
    });

    it("should accept an argument of type [Date]", async () => {
      const initialTimestamp = await time.latest();
      const newTimestamp = initialTimestamp + 3600;

      // multiply by 1000 because Date accepts Epoch millis
      await time.increaseTo(new Date(newTimestamp * 1000));
      const endTimestamp = await time.latest();

      assert.equal(newTimestamp, endTimestamp);
      assert.equal(endTimestamp - initialTimestamp, 3600);
    });
  });

  describe("when allowBlocksWithSameTimestamp is set to true", () => {
    before(async () => {
      const { networkHelpers } = await initializeNetwork({
        allowBlocksWithSameTimestamp: true,
      });
      time = networkHelpers.time;
    });

    it("should not throw if given a timestamp that is equal to the current block timestamp", async () => {
      const initialBlockNumber = await time.latestBlock();
      const initialTimestamp = await time.latest();

      await time.increaseTo(initialTimestamp);

      const endBlockNumber = await time.latestBlock();
      const endTimestamp = await time.latest();

      assert.equal(endBlockNumber, initialBlockNumber + 1);
      assert.equal(endTimestamp, initialTimestamp);
    });

    it("should throw if given a timestamp that is less than the current block timestamp", async () => {
      const initialTimestamp = await time.latest();

      await assertRejects(
        time.increaseTo(initialTimestamp - 1),
        (error: Error) => {
          assert.match(
            error.message,
            /is lower than the previous block's timestamp/,
          );
          return true;
        },
      );
    });
  });
});

import type { NetworkHelpers, Time } from "../../src/types.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { assertRejects } from "@nomicfoundation/hardhat-test-utils";

import { initializeNetwork } from "../helpers/helpers.js";

describe("time - setNextBlockTimestamp", () => {
  let time: Time;
  let networkHelpers: NetworkHelpers;

  before(async () => {
    ({ networkHelpers } = await initializeNetwork());
    time = networkHelpers.time;
  });

  it("should not mine a new block", async () => {
    const initialHeight = await time.latestBlock();

    await time.setNextBlockTimestamp((await time.latest()) + 1);

    const endHeight = await time.latestBlock();
    assert.equal(initialHeight, endHeight);
  });

  it("should set the next block to the given timestamp [epoch seconds]", async () => {
    const initialHeight = await time.latestBlock();
    const newTimestamp = (await time.latest()) + 10_000;

    await time.setNextBlockTimestamp(newTimestamp);
    await networkHelpers.mine();

    const endHeight = await time.latestBlock();
    const endTimestamp = await time.latest();

    assert.equal(initialHeight + 1, endHeight);
    assert.equal(newTimestamp, endTimestamp);
  });

  it("should set the next block to the given timestamp [Date]", async () => {
    const initialHeight = await time.latestBlock();
    const newTimestamp = (await time.latest()) + 10_000;

    // multiply by 1000 because Date accepts Epoch millis
    await time.setNextBlockTimestamp(new Date(newTimestamp * 1000));
    await networkHelpers.mine();

    const endHeight = await time.latestBlock();
    const endTimestamp = await time.latest();

    assert.equal(initialHeight + 1, endHeight);
    assert.equal(newTimestamp, endTimestamp);
  });

  it("should throw if given a timestamp that is equal to the current block timestamp", async () => {
    const initialTimestamp = await time.latest();

    // eslint-disable-next-line no-restricted-syntax -- only used in test to verify error not thrown by Hardhat
    await assert.rejects(async () =>
      time.setNextBlockTimestamp(initialTimestamp),
    );
  });

  it("should throw if given a timestamp that is less than the current block timestamp", async () => {
    const initialTimestamp = await time.latest();

    // eslint-disable-next-line no-restricted-syntax -- only used in test to verify error not thrown by Hardhat
    await assert.rejects(async () =>
      time.setNextBlockTimestamp(initialTimestamp - 1),
    );
  });

  describe("blocks with same timestamp", () => {
    before(async () => {
      ({ networkHelpers } = await initializeNetwork({
        allowBlocksWithSameTimestamp: true,
      }));
      time = networkHelpers.time;
    });

    it("should not throw if given a timestamp that is equal to the current block timestamp", async () => {
      const initialTimestamp = await time.latest();
      const initialBlockNumber = await time.latestBlock();

      await time.setNextBlockTimestamp(initialTimestamp);
      await networkHelpers.mine();

      const endBlockNumber = await time.latestBlock();
      const endTimestamp = await time.latest();

      assert.equal(endBlockNumber, initialBlockNumber + 1);
      assert.equal(endTimestamp, initialTimestamp);
    });

    it("should throw if given a timestamp that is less than the current block timestamp", async () => {
      const initialTimestamp = await time.latest();

      await assertRejects(
        time.setNextBlockTimestamp(initialTimestamp - 1),
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

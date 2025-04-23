import type { NetworkHelpers, Time } from "../../src/types.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

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

  // TODO: in V3 we are currently missing this functionality
  // describe("blocks with same timestamp", () => {
  //   before(async () => {
  //     ({ provider, networkHelpers } = await initializeNetwork(
  //       "allow-blocks-same-timestamp",
  //     ));
  //   });

  //   it("should not throw if given a timestamp that is equal to the current block timestamp", async () => {
  //     const initialTimestamp = await time.latest();

  //     await time.setNextBlockTimestamp(initialTimestamp);
  //   });

  //   it("should throw if given a timestamp that is less than the current block timestamp", async () => {
  //     const initialBlockNumber = await time.latestBlock();
  //     const initialTimestamp = await time.latest();

  //     await assertRejectsWithHardhatError(
  //       async () =>
  //         time.setNextBlockTimestamp(initialTimestamp - 1),
  //       HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.INVALID_TIMESTAMP_TOO_LOW,
  //       {},
  //     );

  //     await time.setNextBlockTimestamp(initialTimestamp);
  //     await networkHelpers.mine();

  //     const endBlockNumber = await time.latestBlock();
  //     const endTimestamp = await time.latest();

  //     assert.equal(endBlockNumber, initialBlockNumber + 1);
  //     assert.equal(endTimestamp, initialTimestamp);
  //   });
  // });
});

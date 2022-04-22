import { assert } from "chai";

import * as hh from "../../../src";
import { useEnvironment } from "../../test-utils";

describe("time#setNextBlockTimestamp", function () {
  useEnvironment("simple");

  it("should not mine a new block", async function () {
    const initialHeight = await hh.time.latestBlock();

    await hh.time.setNextBlockTimestamp((await hh.time.latest()) + 1);

    const endHeight = await hh.time.latestBlock();

    assert.equal(initialHeight, endHeight);
  });

  it("should set the next block to the given timestamp [epoch seconds]", async function () {
    const initialHeight = await hh.time.latestBlock();
    const newTimestamp = (await hh.time.latest()) + 10_000;

    await hh.time.setNextBlockTimestamp(newTimestamp);
    await hh.mine();

    const endHeight = await hh.time.latestBlock();
    const endTimestamp = await hh.time.latest();

    assert.equal(initialHeight + 1, endHeight);
    assert.equal(newTimestamp, endTimestamp);
  });

  it("should set the next block to the given timestamp [Date]", async function () {
    const initialHeight = await hh.time.latestBlock();
    const newTimestamp = (await hh.time.latest()) + 10_000;

    // multiply by 1000 because Date accepts Epoch millis
    await hh.time.setNextBlockTimestamp(new Date(newTimestamp * 1000));
    await hh.mine();

    const endHeight = await hh.time.latestBlock();
    const endTimestamp = await hh.time.latest();

    assert.equal(initialHeight + 1, endHeight);
    assert.equal(newTimestamp, endTimestamp);
  });

  it("should throw if given a timestamp that is equal to the current block timestamp", async function () {
    const initialTimestamp = await hh.time.latest();

    await assert.isRejected(hh.time.setNextBlockTimestamp(initialTimestamp));
  });

  it("should throw if given a timestamp that is less than the current block timestamp", async function () {
    const initialTimestamp = await hh.time.latest();

    await assert.isRejected(
      hh.time.setNextBlockTimestamp(initialTimestamp - 1)
    );
  });
});

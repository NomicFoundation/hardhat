import { assert } from "chai";

import * as hh from "../../../src";
import { useEnvironment } from "../../test-utils";

describe("time#increaseTo", function () {
  useEnvironment("simple");

  it("should mine a new block with the given timestamp", async function () {
    const initialTimestamp = await hh.time.latest();

    const newTimestamp = initialTimestamp + 10000;

    await hh.time.increaseTo(newTimestamp);

    const endTimestamp = await hh.time.latest();

    assert.equal(newTimestamp, endTimestamp);
    assert(endTimestamp - initialTimestamp === 10000);
  });

  it("should throw if given a timestamp that is less than the current block timestamp", async function () {
    const initialTimestamp = await hh.time.latest();

    await assert.isRejected(hh.time.increaseTo(initialTimestamp - 1));
  });
});

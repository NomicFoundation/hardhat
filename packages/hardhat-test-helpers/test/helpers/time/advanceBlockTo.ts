import { assert } from "chai";

import * as hh from "../../../src";
import { useEnvironment } from "../../test-utils";

describe("time#advanceBlockTo", function () {
  useEnvironment("simple");

  it("should increase the block height to the given block number", async function () {
    const initialHeight = await hh.time.latestBlock();

    await hh.time.advanceBlockTo(initialHeight + 3);

    const endHeight = await hh.time.latestBlock();

    assert.equal(initialHeight + 3, endHeight);
  });

  it("should throw if given a number lower than the current height", async function () {
    const initialHeight = await hh.time.latestBlock();

    await assert.isRejected(hh.time.advanceBlockTo(initialHeight - 1));
  });
});

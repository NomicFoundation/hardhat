import { assert } from "chai";

import * as hh from "../../../src";
import { useEnvironment } from "../../test-utils";

describe("time#advanceBlock", function () {
  useEnvironment("simple");

  it("should increase the block height by the given number of blocks", async function () {
    const initialHeight = await hh.time.latestBlock();

    const newHeight = await hh.time.advanceBlock(3);

    const endHeight = await hh.time.latestBlock();

    assert.equal(newHeight, endHeight);
    assert.equal(initialHeight + 3, endHeight);
  });

  it("should throw if given a negative number", async function () {
    await assert.isRejected(hh.time.advanceBlock(-1));
  });
});

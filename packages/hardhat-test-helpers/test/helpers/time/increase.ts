import { assert } from "chai";

import * as hh from "../../../src";
import { useEnvironment } from "../../test-utils";

describe("time#increase", function () {
  useEnvironment("simple");

  it("should mine a new block with the timestamp increased by a given number of seconds", async function () {
    const initialTimestamp = await hh.time.latest();

    const newTimestamp = initialTimestamp + 10000;

    const returnedTimestamp = await hh.time.increase(10000);

    const endTimestamp = await hh.time.latest();

    assert.equal(newTimestamp, endTimestamp);
    assert.equal(returnedTimestamp, endTimestamp);
    assert(endTimestamp - initialTimestamp === 10000);
  });

  it("should throw if given a negative timestamp", async function () {
    await assert.isRejected(hh.time.increase(-1));
  });
});

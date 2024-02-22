import { assert } from "chai";

import * as hh from "../../../src";
import { useEnvironment } from "../../test-utils";

describe("time#latest", function () {
  useEnvironment("simple");

  it("should retrieve the timestamp of the latest block", async function () {
    const initialTimestamp = await hh.time.latest();

    await hh.time.increase(1);

    const endTimestamp = await hh.time.latest();

    assert.strictEqual(endTimestamp, initialTimestamp + 1);
  });
});

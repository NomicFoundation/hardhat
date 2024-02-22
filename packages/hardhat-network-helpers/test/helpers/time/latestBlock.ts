import { assert } from "chai";

import * as hh from "../../../src";
import { useEnvironment } from "../../test-utils";

describe("time#latestBlock", function () {
  useEnvironment("simple");

  it("should retrieve the height of the latest block", async function () {
    assert.strictEqual(await hh.time.latestBlock(), 0);

    await hh.mine();

    assert.strictEqual(await hh.time.latestBlock(), 1);
  });
});

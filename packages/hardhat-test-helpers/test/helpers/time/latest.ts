import { assert } from "chai";

import * as hh from "../../../src";
import { useEnvironment } from "../../test-utils";

describe("time#latest", function () {
  useEnvironment("simple");

  const setTimestamp = async (ts: string) => {
    await this.ctx.hre.network.provider.send("evm_mine", [ts]);
  };

  it("should retrieve the timestamp of the latest block", async function () {
    const time1 = Date.now() + 10000; // arbitraty number
    await setTimestamp(`0x${time1.toString(16)}`);

    assert.equal(await hh.time.latest(), time1);
  });
});

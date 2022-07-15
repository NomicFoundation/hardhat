import { assert } from "chai";

import * as hh from "../../src";
import { ALCHEMY_URL } from "../setup";
import { useEnvironment } from "../test-utils";

describe("resetWithoutFork", function () {
  useEnvironment("simple");

  it("should reset the non-forked network", async function () {
    assert.equal(await hh.time.latestBlock(), 0);
    await hh.mine();
    assert.equal(await hh.time.latestBlock(), 1);
    await hh.resetWithoutFork();
    assert.equal(await hh.time.latestBlock(), 0);
  });

  it("should reset with an url", async function () {
    if (ALCHEMY_URL === undefined) {
      this.skip();
    }
    this.timeout(60000);

    // fork mainnet
    await hh.resetFork({
      url: ALCHEMY_URL,
    });

    const mainnetBlockNumber = await hh.time.latestBlock();

    // fork goerli
    await hh.resetFork({
      url: ALCHEMY_URL.replace("mainnet", "goerli"),
    });

    const goerliBlockNumber = await hh.time.latestBlock();

    const blockNumberDelta = Math.abs(mainnetBlockNumber - goerliBlockNumber);

    // check that there is a significative difference between the latest
    // block numbers of each chain
    assert.isAbove(blockNumberDelta, 100);
  });
});

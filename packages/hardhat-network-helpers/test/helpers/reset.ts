import { assert } from "chai";

import * as hh from "../../src";
import { INFURA_URL } from "../setup";
import { useEnvironment } from "../test-utils";

describe("resetWithoutFork", function () {
  useEnvironment("simple");

  it("should reset the non-forked network", async function () {
    assert.strictEqual(await hh.time.latestBlock(), 0);
    await hh.mine();
    assert.strictEqual(await hh.time.latestBlock(), 1);
    await hh.reset();
    assert.strictEqual(await hh.time.latestBlock(), 0);
  });

  it("should reset with a url", async function () {
    if (INFURA_URL === undefined) {
      this.skip();
    }
    this.timeout(60000);

    // fork mainnet
    await hh.reset(INFURA_URL);

    const mainnetBlockNumber = await hh.time.latestBlock();

    // fork goerli
    await hh.reset(INFURA_URL.replace("mainnet", "goerli"));

    const goerliBlockNumber = await hh.time.latestBlock();

    const blockNumberDelta = Math.abs(mainnetBlockNumber - goerliBlockNumber);

    // check that there is a significative difference between the latest
    // block numbers of each chain
    assert.isAbove(blockNumberDelta, 100);
  });

  it("should reset with a url and block number", async function () {
    if (INFURA_URL === undefined) {
      this.skip();
    }
    this.timeout(60000);

    // fork mainnet
    await hh.reset(INFURA_URL);

    const mainnetBlockNumber = await hh.time.latestBlock();
    assert.isAbove(mainnetBlockNumber, 1_000_000);

    // fork an older block number
    await hh.reset(INFURA_URL, mainnetBlockNumber - 1000);
    const olderMainnetBlockNumber = await hh.time.latestBlock();
    assert.strictEqual(olderMainnetBlockNumber, mainnetBlockNumber - 1000);
  });
});

import { assert } from "chai";
import * as hh from "../../src";
import { INFURA_URL } from "../setup";
import { useEnvironment } from "../test-utils";
describe("resetWithoutFork", function () {
  useEnvironment("simple");

  it("should reset the non-forked network", async function () {
    assert.equal(await hh.time.latestBlock(), 0);
    await hh.mine();
    assert.equal(await hh.time.latestBlock(), 1);
    await hh.reset();
    assert.equal(await hh.time.latestBlock(), 0);
  });

  it("should reset with a url", async function () {
    if (INFURA_URL === undefined) {
      this.skip();
    }
    this.timeout(60000);

    // fork mainnet
    await hh.reset(INFURA_URL);

    const mainnetBlockNumber = await hh.time.latestBlock();

    // fork sepolia
    await hh.reset(INFURA_URL.replace("mainnet", "sepolia"));

    const sepoliaBlockNumber = await hh.time.latestBlock();

    const blockNumberDelta = Math.abs(mainnetBlockNumber - sepoliaBlockNumber);

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
    assert.equal(olderMainnetBlockNumber, mainnetBlockNumber - 1000);
  });
});

describe("should clear snapshot upon reset", function () {
  useEnvironment("simple");
  it("checks if the snapshot is cleared upon hardhat_reset", async function () {
    const snapshotBeforeReset = await hh.takeSnapshot();
    await hh.reset();
    const snapshotAfterReset = await hh.takeSnapshot();
    assert.equal(snapshotBeforeReset.snapshotId, snapshotAfterReset.snapshotId);
  });
});

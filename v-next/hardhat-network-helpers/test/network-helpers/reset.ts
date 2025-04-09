import type { NetworkHelpers } from "../../src/types.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { initializeNetwork } from "../helpers/helpers.js";

const INFURA_URL = process.env.INFURA_URL;
describe("network-helpers - reset", () => {
  let networkHelpers: NetworkHelpers;

  before(async () => {
    ({ networkHelpers } = await initializeNetwork());
  });

  it("should reset the non-forked network", async () => {
    assert.equal(await networkHelpers.time.latestBlock(), 0);
    await networkHelpers.mine();
    assert.equal(await networkHelpers.time.latestBlock(), 1);
    await networkHelpers.reset();
    assert.equal(await networkHelpers.time.latestBlock(), 0);
  });

  it("should reset with a url", { timeout: 120000 }, async (t) => {
    if (INFURA_URL === undefined) {
      t.skip("INFURA_URL environment variable is not set");
      return;
    }

    // fork mainnet
    await networkHelpers.reset(INFURA_URL);

    const mainnetBlockNumber = await networkHelpers.time.latestBlock();

    // fork Sepolia
    await networkHelpers.reset(INFURA_URL.replace("mainnet", "sepolia"));

    const sepoliaBlockNumber = await networkHelpers.time.latestBlock();
    const blockNumberDelta = Math.abs(mainnetBlockNumber - sepoliaBlockNumber);

    // check there is a significant difference between block numbers of each chain
    assert(
      blockNumberDelta > 100,
      `Expected block delta > 100, got ${blockNumberDelta}`,
    );
  });

  it(
    "should reset with a url and block number",
    { timeout: 120000 },
    async (t) => {
      if (INFURA_URL === undefined) {
        t.skip("INFURA_URL environment variable is not set");
        return;
      }

      // fork mainnet
      await networkHelpers.reset(INFURA_URL);

      const mainnetBlockNumber = await networkHelpers.time.latestBlock();
      assert(
        mainnetBlockNumber > 1_000_000,
        `Block number is too low: ${mainnetBlockNumber}`,
      );

      // fork an older block number
      await networkHelpers.reset(INFURA_URL, mainnetBlockNumber - 1000);
      const olderMainnetBlockNumber = await networkHelpers.time.latestBlock();
      assert.equal(olderMainnetBlockNumber, mainnetBlockNumber - 1000);
    },
  );

  describe("should clear snapshot upon reset", () => {
    it("checks if the snapshot is cleared upon hardhat_reset", async () => {
      const snapshotBeforeReset = await networkHelpers.takeSnapshot();
      await networkHelpers.reset();
      const snapshotAfterReset = await networkHelpers.takeSnapshot();
      assert.equal(
        snapshotBeforeReset.snapshotId,
        snapshotAfterReset.snapshotId,
      );
    });
  });
});

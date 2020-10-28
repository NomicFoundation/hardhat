import { assert } from "chai";

import { MiningTimer } from "../../../../src/internal/hardhat-network/provider/MiningTimer";
import { DEFAULT_INTERVAL_MINING_CONFIG } from "../helpers/providers";

describe("Mining Timer", () => {
  let miningTimer: MiningTimer;

  beforeEach(() => {
    miningTimer = new MiningTimer(
      DEFAULT_INTERVAL_MINING_CONFIG.blockTime,
      () => {}
    );
  });

  describe("setBlockTime", () => {
    it("sets a new block time", () => {
      const newBlockTime = 15000;
      miningTimer.setBlockTime(newBlockTime);

      const actualBlockTime = miningTimer.getBlockTime();

      assert.equal(actualBlockTime, newBlockTime);
    });

    it("throws when the new block time is 0 ms or less", () => {
      assert.throws(
        () => miningTimer.setBlockTime(0),
        Error,
        "New block time must be greater than 0 ms"
      );

      assert.throws(
        () => miningTimer.setBlockTime(-1),
        Error,
        "New block time must be greater than 0 ms"
      );
    });
  });
});

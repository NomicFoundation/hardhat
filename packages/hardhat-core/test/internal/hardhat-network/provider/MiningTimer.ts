import { assert } from "chai";
import sinon from "sinon";

import { MiningTimer } from "../../../../src/internal/hardhat-network/provider/MiningTimer";
import { DEFAULT_INTERVAL_MINING_CONFIG } from "../helpers/providers";

describe("Mining Timer", () => {
  let miningTimer: MiningTimer;
  let mineFunction: sinon.SinonSpy;
  let sinonClock: sinon.SinonFakeTimers;

  beforeEach(() => {
    mineFunction = sinon.fake();

    miningTimer = new MiningTimer(
      DEFAULT_INTERVAL_MINING_CONFIG.blockTime,
      mineFunction
    );

    sinonClock = sinon.useFakeTimers({
      now: Date.now(),
      toFake: ["setTimeout"],
    });
  });

  afterEach(() => {
    sinonClock.restore();
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

  describe("start", () => {
    it("starts the loop", async () => {
      miningTimer.start();

      assert.isTrue(mineFunction.notCalled);

      await sinonClock.tickAsync(DEFAULT_INTERVAL_MINING_CONFIG.blockTime);
      assert.isTrue(mineFunction.calledOnce);
    });

    it("the loop executes the callback over time", async () => {
      miningTimer.start();

      assert.isTrue(mineFunction.notCalled);

      await sinonClock.tickAsync(DEFAULT_INTERVAL_MINING_CONFIG.blockTime);
      assert.isTrue(mineFunction.calledOnce);

      await sinonClock.tickAsync(DEFAULT_INTERVAL_MINING_CONFIG.blockTime);
      assert.isTrue(mineFunction.calledTwice);

      await sinonClock.tickAsync(DEFAULT_INTERVAL_MINING_CONFIG.blockTime);
      assert.isTrue(mineFunction.calledThrice);
    });

    it("multiple start() calls don't affect the loop", async () => {
      miningTimer.start();

      await sinonClock.tickAsync(
        DEFAULT_INTERVAL_MINING_CONFIG.blockTime - 500
      );

      miningTimer.start();

      assert.isTrue(mineFunction.notCalled);

      await sinonClock.tickAsync(500);

      assert.isTrue(mineFunction.calledOnce);
    });
  });

  describe("stop", () => {
    it("stops the loop", async () => {
      miningTimer.start();

      assert.isTrue(mineFunction.notCalled);

      miningTimer.stop();

      await sinonClock.tickAsync(DEFAULT_INTERVAL_MINING_CONFIG.blockTime);
      assert.isTrue(mineFunction.notCalled);
    });
  });
});

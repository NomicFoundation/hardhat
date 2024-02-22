import { assert } from "chai";
import sinon from "sinon";

import { MiningTimer } from "../../../../src/internal/hardhat-network/provider/MiningTimer";
import { sleep } from "../helpers/sleep";

describe("Mining Timer", () => {
  const defaultBlockTime = 10000;
  let miningTimer: MiningTimer;
  let mineFunction: sinon.SinonSpy;
  let sinonClock: sinon.SinonFakeTimers;

  beforeEach(() => {
    mineFunction = sinon.fake();

    miningTimer = new MiningTimer(defaultBlockTime, mineFunction);

    sinonClock = sinon.useFakeTimers({
      now: Date.now(),
      toFake: ["setTimeout", "clearTimeout"],
    });
  });

  afterEach(() => {
    sinonClock.restore();
  });

  describe("construction", function () {
    it("throws when blockTime passed to the constructor is negative", () => {
      assert.throws(
        () => new MiningTimer(-1, mineFunction),
        Error,
        "Block time cannot be negative"
      );
    });

    it("throws when blockTime range is invalid", () => {
      assert.throws(
        () => new MiningTimer([2000, 1000], mineFunction),
        Error,
        "Invalid block time range"
      );
    });
  });

  describe("setBlockTime", () => {
    it("sets a new block time (fixed interval)", () => {
      const newBlockTime = 15000;

      miningTimer.setBlockTime(newBlockTime);

      const actualBlockTime = miningTimer.getBlockTime();

      assert.strictEqual(actualBlockTime, newBlockTime);
    });

    it("sets a new block time (range)", () => {
      const newBlockTime: [number, number] = [0, 2000];

      miningTimer.setBlockTime(newBlockTime);

      const actualBlockTime = miningTimer.getBlockTime();

      assert.strictEqual(actualBlockTime, newBlockTime);
    });

    it("triggers a new loop when mining timer is running", async () => {
      const newBlockTime = Math.ceil(defaultBlockTime / 2);

      miningTimer.start();

      await sinonClock.tickAsync(defaultBlockTime - 500);

      miningTimer.setBlockTime(newBlockTime);

      await sinonClock.tickAsync(500);

      const currentBlockTime = miningTimer.getBlockTime();

      assert.strictEqual(currentBlockTime, newBlockTime);
      assert.isTrue(mineFunction.notCalled);

      await sinonClock.tickAsync(newBlockTime - 500);
      assert.isTrue(mineFunction.calledOnce);
    });

    it("triggers a new loop when new block time is the same as the old one", async () => {
      miningTimer.start();

      await sinonClock.tickAsync(defaultBlockTime - 500);

      miningTimer.setBlockTime(defaultBlockTime);

      await sinonClock.tickAsync(500);

      assert.isTrue(mineFunction.notCalled);

      await sinonClock.tickAsync(defaultBlockTime - 500);
      assert.isTrue(mineFunction.calledOnce);
    });

    it("stops when the new block time is 0", async function () {
      miningTimer.start();

      await sinonClock.tickAsync(defaultBlockTime - 500);

      miningTimer.setBlockTime(0);

      assert.isTrue(mineFunction.notCalled);

      await sinonClock.tickAsync(defaultBlockTime + 500);
      assert.isTrue(mineFunction.notCalled);
    });

    it("throws when the new block time is negative", () => {
      assert.throws(
        () => miningTimer.setBlockTime(-1),
        Error,
        "Block time cannot be negative"
      );
    });

    it("throws when the new block time is an invalid range", () => {
      assert.throws(
        () => miningTimer.setBlockTime([3000, 2000]),
        Error,
        "Invalid block time range"
      );
    });
  });

  describe("start", () => {
    it("starts the loop", async () => {
      miningTimer.start();

      assert.isTrue(mineFunction.notCalled);

      await sinonClock.tickAsync(defaultBlockTime);
      assert.isTrue(mineFunction.calledOnce);
    });

    it("the loop executes the callback over time", async () => {
      miningTimer.start();

      assert.isTrue(mineFunction.notCalled);

      await sinonClock.tickAsync(defaultBlockTime);
      assert.isTrue(mineFunction.calledOnce);

      await sinonClock.tickAsync(defaultBlockTime);
      assert.isTrue(mineFunction.calledTwice);

      await sinonClock.tickAsync(defaultBlockTime);
      assert.isTrue(mineFunction.calledThrice);
    });

    it("the loop awaits for async callback execution before looping again", async () => {
      const interval = 500;
      let callCount = 0;

      const newMineFunction = async (): Promise<any> => {
        await sleep(100);
        callCount++;
      };

      miningTimer = new MiningTimer(interval, newMineFunction);

      miningTimer.start();

      await sinonClock.tickAsync(interval);

      assert.strictEqual(callCount, 0);

      await sinonClock.tickAsync(90);

      assert.strictEqual(callCount, 0);

      await sinonClock.tickAsync(10);

      assert.strictEqual(callCount, 1);

      await sinonClock.tickAsync(interval + 50);

      assert.strictEqual(callCount, 1);

      await sinonClock.tickAsync(50);

      assert.strictEqual(callCount, 2);
    });

    it("multiple start calls don't affect the loop", async () => {
      miningTimer.start();

      await sinonClock.tickAsync(defaultBlockTime - 500);

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

      await sinonClock.tickAsync(defaultBlockTime);
      assert.isTrue(mineFunction.notCalled);
    });

    it("stops the loop after a couple of callback executions", async () => {
      miningTimer.start();

      await sinonClock.tickAsync(2 * defaultBlockTime);

      assert.isTrue(mineFunction.calledTwice);

      mineFunction.resetHistory();
      miningTimer.stop();

      await sinonClock.tickAsync(defaultBlockTime);
      assert.isTrue(mineFunction.notCalled);
    });
  });
});

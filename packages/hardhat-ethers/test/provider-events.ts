import { assert } from "chai";
import sinon from "sinon";

import { useEnvironment } from "./environment";
import { sleep, tryUntil } from "./helpers";

describe("provider events", function () {
  useEnvironment("minimal-project");

  describe("transaction events", function () {
    beforeEach(async function () {
      await this.env.network.provider.send("evm_setAutomine", [false]);
    });

    it("should support .on(txHash)", async function () {
      const [s] = await this.env.ethers.getSigners();
      const tx = await s.sendTransaction({ to: s });

      let listener: any;
      const txPromise = new Promise((resolve) => {
        listener = resolve;
      });
      await this.env.ethers.provider.on(tx.hash, listener);

      await this.env.network.provider.send("hardhat_mine");

      await txPromise;

      await this.env.ethers.provider.off(tx.hash, listener);
    });

    it("should support .once(txHash)", async function () {
      const [s] = await this.env.ethers.getSigners();
      const tx = await s.sendTransaction({ to: s });

      const listener = sinon.stub();
      await this.env.ethers.provider.once(tx.hash, listener);

      await this.env.network.provider.send("hardhat_mine");

      await tryUntil(() => {
        assert.equal(listener.callCount, 1);
      });
    });

    it("should remove a listener with .off()", async function () {
      const [s] = await this.env.ethers.getSigners();
      const tx1 = await s.sendTransaction({ to: s, gasLimit: 21_000 });
      const tx2 = await s.sendTransaction({ to: s, gasLimit: 21_000 });

      const listener1 = sinon.stub();
      const listener2 = sinon.stub();
      await this.env.ethers.provider.on(tx1.hash, listener1);
      await this.env.ethers.provider.once(tx2.hash, listener2);

      await this.env.ethers.provider.off(tx1.hash, listener1);
      await this.env.ethers.provider.off(tx2.hash, listener2);

      await this.env.network.provider.send("hardhat_mine");

      await sleep(100);

      assert.isFalse(listener1.called);
      assert.isFalse(listener2.called);
    });

    it("should remove all listeners if .off() is called without a listener", async function () {
      const [s] = await this.env.ethers.getSigners();
      const tx1 = await s.sendTransaction({ to: s, gasLimit: 21_000 });
      const tx2 = await s.sendTransaction({ to: s, gasLimit: 21_000 });

      const listener1 = sinon.stub();
      const listener2 = sinon.stub();
      await this.env.ethers.provider.on(tx1.hash, listener1);
      await this.env.ethers.provider.once(tx2.hash, listener2);

      await this.env.ethers.provider.off(tx1.hash);
      await this.env.ethers.provider.off(tx2.hash);

      await this.env.network.provider.send("hardhat_mine");

      await sleep(100);

      assert.isFalse(listener1.called);
      assert.isFalse(listener2.called);
    });

    it("should remove all listeners if removeAllListeners(txHash) is called", async function () {
      const [s] = await this.env.ethers.getSigners();
      const tx1 = await s.sendTransaction({ to: s, gasLimit: 21_000 });
      const tx2 = await s.sendTransaction({ to: s, gasLimit: 21_000 });

      const listener1 = sinon.stub();
      const listener2 = sinon.stub();
      await this.env.ethers.provider.on(tx1.hash, listener1);
      await this.env.ethers.provider.once(tx2.hash, listener2);

      await this.env.ethers.provider.removeAllListeners(tx1.hash);
      await this.env.ethers.provider.removeAllListeners(tx2.hash);

      await this.env.network.provider.send("hardhat_mine");

      await sleep(100);

      assert.isFalse(listener1.called);
      assert.isFalse(listener2.called);
    });

    it("should remove all listeners if removeAllListeners() is called", async function () {
      const [s] = await this.env.ethers.getSigners();
      const tx1 = await s.sendTransaction({ to: s, gasLimit: 21_000 });
      const tx2 = await s.sendTransaction({ to: s, gasLimit: 21_000 });

      const listener1 = sinon.stub();
      const listener2 = sinon.stub();
      await this.env.ethers.provider.on(tx1.hash, listener1);
      await this.env.ethers.provider.once(tx2.hash, listener2);

      await this.env.ethers.provider.removeAllListeners();

      await this.env.network.provider.send("hardhat_mine");

      await sleep(100);

      assert.isFalse(listener1.called);
      assert.isFalse(listener2.called);
    });
  });

  describe("block events", function () {
    it("should support .on('block')", async function () {
      let listener: any;
      const blockPromise = new Promise((resolve) => {
        listener = resolve;
      });

      await this.env.ethers.provider.on("block", listener);

      // should be emitted when a tx is sent
      await this.env.network.provider.send("hardhat_mine");

      await blockPromise;

      // remove subscription
      await this.env.ethers.provider.off("block", listener);
    });

    it("should support .on('block') in multiple contexts", async function () {
      const blockListener = sinon.stub();
      await this.env.ethers.provider.on("block", blockListener);

      // should be emitted when a tx is sent
      const [s] = await this.env.ethers.getSigners();
      await s.sendTransaction({ to: s });

      // should be emitted when a block is mined
      await this.env.network.provider.send("hardhat_mine");

      // should be emitted when several blocks are mined
      await this.env.network.provider.send("hardhat_mine", ["0x5"]);

      await tryUntil(() => {
        assert.equal(blockListener.callCount, 7);
      });

      // remove subscription
      await this.env.ethers.provider.off("block", blockListener);
    });

    it("should support .once('block')", async function () {
      const blockListener = sinon.stub();
      await this.env.ethers.provider.once("block", blockListener);

      // should be emitted when a tx is sent
      const [s] = await this.env.ethers.getSigners();
      await s.sendTransaction({ to: s });

      await tryUntil(() => {
        assert.equal(blockListener.callCount, 1);
      });

      // shouldn't be emitted a second time
      await s.sendTransaction({ to: s });
      await sleep(100);
      assert.equal(blockListener.callCount, 1);
    });

    it("should remove a listener with .off()", async function () {
      const listener1 = sinon.stub();
      const listener2 = sinon.stub();
      await this.env.ethers.provider.on("block", listener1);
      await this.env.ethers.provider.once("block", listener2);

      await this.env.ethers.provider.off("block", listener1);
      await this.env.ethers.provider.off("block", listener2);

      // mine a block
      const [s] = await this.env.ethers.getSigners();
      await s.sendTransaction({ to: s });

      await sleep(100);

      assert.isFalse(listener1.called);
      assert.isFalse(listener2.called);
    });

    it("should remove all listeners if .off() is called without a listener", async function () {
      const listener1 = sinon.stub();
      const listener2 = sinon.stub();
      await this.env.ethers.provider.on("block", listener1);
      await this.env.ethers.provider.once("block", listener2);

      await this.env.ethers.provider.off("block");

      // mine a block
      const [s] = await this.env.ethers.getSigners();
      await s.sendTransaction({ to: s });

      await sleep(100);

      assert.isFalse(listener1.called);
      assert.isFalse(listener2.called);
    });

    it("should remove all listeners if .removeAllListeners('block') is called", async function () {
      const listener1 = sinon.stub();
      const listener2 = sinon.stub();
      await this.env.ethers.provider.on("block", listener1);
      await this.env.ethers.provider.once("block", listener2);

      await this.env.ethers.provider.removeAllListeners("block");

      // mine a block
      const [s] = await this.env.ethers.getSigners();
      await s.sendTransaction({ to: s });

      await sleep(100);

      assert.isFalse(listener1.called);
      assert.isFalse(listener2.called);
    });

    it("should remove all listeners if .removeAllListeners() is called", async function () {
      const listener1 = sinon.stub();
      const listener2 = sinon.stub();
      await this.env.ethers.provider.on("block", listener1);
      await this.env.ethers.provider.once("block", listener2);

      await this.env.ethers.provider.removeAllListeners();

      // mine a block
      const [s] = await this.env.ethers.getSigners();
      await s.sendTransaction({ to: s });

      await sleep(100);

      assert.isFalse(listener1.called);
      assert.isFalse(listener2.called);
    });
  });
});

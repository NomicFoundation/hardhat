import { assert, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";

import { useEnvironment } from "./environment";
import { sleep, tryUntil } from "./helpers";

use(chaiAsPromised);

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

    it("should support .addListener and .removeListener as aliases", async function () {
      const [s] = await this.env.ethers.getSigners();
      const tx = await s.sendTransaction({ to: s });

      let listener: any;
      const txPromise = new Promise((resolve) => {
        listener = resolve;
      });
      await this.env.ethers.provider.addListener(tx.hash, listener);

      await this.env.network.provider.send("hardhat_mine");

      await txPromise;

      await this.env.ethers.provider.removeListener(tx.hash, listener);
    });

    it("should support .once(txHash)", async function () {
      const [s] = await this.env.ethers.getSigners();
      const tx = await s.sendTransaction({ to: s });

      const listener = sinon.stub();
      await this.env.ethers.provider.once(tx.hash, listener);

      await this.env.network.provider.send("hardhat_mine");

      await tryUntil(() => {
        assert.strictEqual(listener.callCount, 1);
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

    it("should support emitting a transaction event", async function () {
      const fakeTransactionHash =
        "0x1234567812345678123456781234567812345678123456781234567812345678";
      const listener = sinon.spy();
      await this.env.ethers.provider.once(fakeTransactionHash, listener);

      const fakeTransaction = {};
      await this.env.ethers.provider.emit(fakeTransactionHash, fakeTransaction);

      await tryUntil(() => {
        assert.isTrue(listener.calledOnceWith(fakeTransaction));
      });
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
        assert.strictEqual(blockListener.callCount, 7);
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
        assert.strictEqual(blockListener.callCount, 1);
      });

      // shouldn't be emitted a second time
      await s.sendTransaction({ to: s });
      await sleep(100);
      assert.strictEqual(blockListener.callCount, 1);
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

    it("should support emitting a block event", async function () {
      let listener: sinon.SinonSpy = null as any;
      const blockPromise = new Promise<void>((resolve) => {
        listener = sinon.spy(() => {
          resolve();
        });
      });

      await this.env.ethers.provider.on("block", listener);

      // should be emitted when a tx is sent
      await this.env.ethers.provider.emit("block", 123);

      await blockPromise;

      assert.isTrue(listener.calledOnceWith(123));

      // remove subscription
      await this.env.ethers.provider.off("block", listener);
    });
  });

  describe("listeners getters", function () {
    it("should get all the block listeners", async function () {
      const listener1 = () => {};
      const listener2 = () => {};

      await this.env.ethers.provider.on("block", listener1);
      await this.env.ethers.provider.once("block", listener2);

      const listeners = await this.env.ethers.provider.listeners("block");

      assert.lengthOf(listeners, 2);
      assert.sameMembers(listeners, [listener1, listener2]);

      await this.env.ethers.provider.off("block");
    });

    it("should get the right block listeners after a block is mined", async function () {
      const listener1 = () => {};
      const listener2 = () => {};

      await this.env.ethers.provider.on("block", listener1);
      await this.env.ethers.provider.once("block", listener2);

      await this.env.network.provider.send("hardhat_mine");

      await tryUntil(async () => {
        const listeners = await this.env.ethers.provider.listeners("block");

        assert.lengthOf(listeners, 1);
        assert.sameMembers(listeners, [listener1]);
      });

      await this.env.ethers.provider.off("block");
    });
  });

  describe("unsupported events", function () {
    it("should throw if .on is called with an unsupported event type", async function () {
      await assert.isRejected(
        this.env.ethers.provider.on([], () => {}),
        "is not supported"
      );
    });

    it("should throw if .once is called with an unsupported event type", async function () {
      await assert.isRejected(
        this.env.ethers.provider.once([], () => {}),
        "is not supported"
      );
    });
  });
});

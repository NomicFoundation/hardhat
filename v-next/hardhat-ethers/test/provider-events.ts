import type { HardhatEthers } from "../src/types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { initializeTestEthers, sleep, tryUntil } from "./helpers/helpers.js";

describe("provider events", () => {
  let ethers: HardhatEthers;
  let ethereumProvider: EthereumProvider;

  beforeEach(async () => {
    ({ ethers, provider: ethereumProvider } = await initializeTestEthers());
  });

  describe("transaction events", () => {
    beforeEach(async () => {
      await ethereumProvider.request({
        method: "evm_setAutomine",
        params: [false],
      });
    });

    it("should support .on(txHash)", async () => {
      const [s] = await ethers.getSigners();
      const tx = await s.sendTransaction({ to: s });

      let listener: any;
      const txPromise = new Promise((resolve) => {
        listener = resolve;
      });
      await ethers.provider.on(tx.hash, listener);

      await ethereumProvider.request({ method: "hardhat_mine" });

      await txPromise;

      await ethers.provider.off(tx.hash, listener);
    });

    it("should support .addListener and .removeListener as aliases", async () => {
      const [s] = await ethers.getSigners();
      const tx = await s.sendTransaction({ to: s });

      let listener: any;
      const txPromise = new Promise((resolve) => {
        listener = resolve;
      });
      await ethers.provider.addListener(tx.hash, listener);

      await ethereumProvider.request({ method: "hardhat_mine" });

      await txPromise;

      await ethers.provider.removeListener(tx.hash, listener);
    });

    it("should support .once(txHash)", async () => {
      const [s] = await ethers.getSigners();
      const tx = await s.sendTransaction({ to: s });

      const listener = mock.fn();

      await ethers.provider.once(tx.hash, listener);

      await ethereumProvider.request({ method: "hardhat_mine" });

      await tryUntil(() => {
        assert.equal(listener.mock.callCount(), 1);
      });
    });

    it("should remove a listener with .off()", async () => {
      const [s] = await ethers.getSigners();
      const tx1 = await s.sendTransaction({ to: s, gasLimit: 21_000 });
      const tx2 = await s.sendTransaction({ to: s, gasLimit: 21_000 });

      const listener1 = mock.fn();
      const listener2 = mock.fn();
      await ethers.provider.on(tx1.hash, listener1);
      await ethers.provider.once(tx2.hash, listener2);

      await ethers.provider.off(tx1.hash, listener1);
      await ethers.provider.off(tx2.hash, listener2);

      await ethereumProvider.request({ method: "hardhat_mine" });

      await sleep(100);

      assert.equal(listener1.mock.callCount(), 0);
      assert.equal(listener2.mock.callCount(), 0);
    });

    it("should remove all listeners if .off() is called without a listener", async () => {
      const [s] = await ethers.getSigners();
      const tx1 = await s.sendTransaction({ to: s, gasLimit: 21_000 });
      const tx2 = await s.sendTransaction({ to: s, gasLimit: 21_000 });

      const listener1 = mock.fn();
      const listener2 = mock.fn();
      await ethers.provider.on(tx1.hash, listener1);
      await ethers.provider.once(tx2.hash, listener2);

      await ethers.provider.off(tx1.hash);
      await ethers.provider.off(tx2.hash);

      await ethereumProvider.request({ method: "hardhat_mine" });

      await sleep(100);

      assert.equal(listener1.mock.callCount(), 0);
      assert.equal(listener2.mock.callCount(), 0);
    });

    it("should remove all listeners if removeAllListeners(txHash) is called", async () => {
      const [s] = await ethers.getSigners();
      const tx1 = await s.sendTransaction({ to: s, gasLimit: 21_000 });
      const tx2 = await s.sendTransaction({ to: s, gasLimit: 21_000 });

      const listener1 = mock.fn();
      const listener2 = mock.fn();
      await ethers.provider.on(tx1.hash, listener1);
      await ethers.provider.once(tx2.hash, listener2);

      await ethers.provider.removeAllListeners(tx1.hash);
      await ethers.provider.removeAllListeners(tx2.hash);

      await ethereumProvider.request({ method: "hardhat_mine" });

      await sleep(100);

      assert.equal(listener1.mock.callCount(), 0);
      assert.equal(listener2.mock.callCount(), 0);
    });

    it("should remove all listeners if removeAllListeners() is called", async () => {
      const [s] = await ethers.getSigners();
      const tx1 = await s.sendTransaction({ to: s, gasLimit: 21_000 });
      const tx2 = await s.sendTransaction({ to: s, gasLimit: 21_000 });

      const listener1 = mock.fn();
      const listener2 = mock.fn();
      await ethers.provider.on(tx1.hash, listener1);
      await ethers.provider.once(tx2.hash, listener2);

      await ethers.provider.removeAllListeners();

      await ethereumProvider.request({ method: "hardhat_mine" });

      await sleep(100);

      assert.equal(listener1.mock.callCount(), 0);
      assert.equal(listener2.mock.callCount(), 0);
    });

    it("should support emitting a transaction event", async () => {
      const fakeTransactionHash =
        "0x1234567812345678123456781234567812345678123456781234567812345678";
      const listener = mock.fn();
      await ethers.provider.once(fakeTransactionHash, listener);

      const fakeTransaction = {};
      await ethers.provider.emit(fakeTransactionHash, fakeTransaction);

      await tryUntil(() => {
        assert.equal(listener.mock.calls[0].arguments[0], fakeTransaction);
      });
    });
  });

  describe("block events", () => {
    it("should support .on('block')", async () => {
      let listener: any;
      const blockPromise = new Promise((resolve) => {
        listener = resolve;
      });

      await ethers.provider.on("block", listener);

      // should be emitted when a tx is sent
      await ethereumProvider.request({ method: "hardhat_mine" });

      await blockPromise;

      // remove subscription
      await ethers.provider.off("block", listener);
    });

    it("should support .on('block') in multiple contexts", async () => {
      const blockListener = mock.fn();
      await ethers.provider.on("block", blockListener);

      // should be emitted when a tx is sent
      const [s] = await ethers.getSigners();
      await s.sendTransaction({ to: s });

      // should be emitted when a block is mined
      await ethereumProvider.request({ method: "hardhat_mine" });

      // should be emitted when several blocks are mined
      await ethereumProvider.request({
        method: "hardhat_mine",
        params: ["0x5"],
      });

      await tryUntil(() => {
        assert.equal(blockListener.mock.callCount(), 7);
      });

      // remove subscription
      await ethers.provider.off("block", blockListener);
    });

    it("should support .once('block')", async () => {
      const blockListener = mock.fn();
      await ethers.provider.once("block", blockListener);

      // should be emitted when a tx is sent
      const [s] = await ethers.getSigners();
      await s.sendTransaction({ to: s });

      await tryUntil(() => {
        assert.equal(blockListener.mock.callCount(), 1);
      });

      // shouldn't be emitted a second time
      await s.sendTransaction({ to: s });
      await sleep(100);
      assert.equal(blockListener.mock.callCount(), 1);
    });

    it("should remove a listener with .off()", async () => {
      const listener1 = mock.fn();
      const listener2 = mock.fn();
      await ethers.provider.on("block", listener1);
      await ethers.provider.once("block", listener2);

      await ethers.provider.off("block", listener1);
      await ethers.provider.off("block", listener2);

      // mine a block
      const [s] = await ethers.getSigners();
      await s.sendTransaction({ to: s });

      await sleep(100);

      assert.equal(listener1.mock.callCount(), 0);
      assert.equal(listener2.mock.callCount(), 0);
    });

    it("should remove all listeners if .off() is called without a listener", async () => {
      const listener1 = mock.fn();
      const listener2 = mock.fn();
      await ethers.provider.on("block", listener1);
      await ethers.provider.once("block", listener2);

      await ethers.provider.off("block");

      // mine a block
      const [s] = await ethers.getSigners();
      await s.sendTransaction({ to: s });

      await sleep(100);

      assert.equal(listener1.mock.callCount(), 0);
      assert.equal(listener2.mock.callCount(), 0);
    });

    it("should remove all listeners if .removeAllListeners('block') is called", async () => {
      const listener1 = mock.fn();
      const listener2 = mock.fn();
      await ethers.provider.on("block", listener1);
      await ethers.provider.once("block", listener2);

      await ethers.provider.removeAllListeners("block");

      // mine a block
      const [s] = await ethers.getSigners();
      await s.sendTransaction({ to: s });

      await sleep(100);

      assert.equal(listener1.mock.callCount(), 0);
      assert.equal(listener2.mock.callCount(), 0);
    });

    it("should remove all listeners if .removeAllListeners() is called", async () => {
      const listener1 = mock.fn();
      const listener2 = mock.fn();
      await ethers.provider.on("block", listener1);
      await ethers.provider.once("block", listener2);

      await ethers.provider.removeAllListeners();

      // mine a block
      const [s] = await ethers.getSigners();
      await s.sendTransaction({ to: s });

      await sleep(100);

      assert.equal(listener1.mock.callCount(), 0);
      assert.equal(listener2.mock.callCount(), 0);
    });

    it("should support emitting a block event", async () => {
      let listener: any;

      const blockPromise = new Promise<void>((resolve) => {
        listener = mock.fn(() => {
          resolve();
        });
      });

      await ethers.provider.on("block", listener);

      // should be emitted when a tx is sent
      await ethers.provider.emit("block", 123);

      await blockPromise;

      assert.equal(listener.mock.calls[0].arguments[0], 123);

      // remove subscription
      await ethers.provider.off("block", listener);
    });
  });

  describe("listeners getters", () => {
    it("should get all the block listeners", async () => {
      const listener1 = () => {};
      const listener2 = () => {};

      await ethers.provider.on("block", listener1);
      await ethers.provider.once("block", listener2);

      const listeners = await ethers.provider.listeners("block");

      assert.equal(listeners.length, 2);
      assert.deepEqual(listeners, [listener1, listener2]);

      await ethers.provider.off("block");
    });

    it("should get the right block listeners after a block is mined", async () => {
      const listener1 = () => {};
      const listener2 = () => {};

      await ethers.provider.on("block", listener1);
      await ethers.provider.once("block", listener2);

      await ethereumProvider.request({ method: "hardhat_mine" });

      await tryUntil(async () => {
        const listeners = await ethers.provider.listeners("block");

        assert.equal(listeners.length, 1);
        assert.deepEqual(listeners, [listener1]);
      });

      await ethers.provider.off("block");
    });
  });

  describe("unsupported events", () => {
    it("should throw if .on is called with an unsupported event type", async () => {
      await assertRejectsWithHardhatError(
        ethers.provider.on([], () => {}),
        HardhatError.ERRORS.ETHERS.EVENT_NOT_SUPPORTED,
        {
          event: [],
        },
      );
    });

    it("should throw if .once is called with an unsupported event type", async () => {
      await assertRejectsWithHardhatError(
        ethers.provider.once([], () => {}),
        HardhatError.ERRORS.ETHERS.EVENT_NOT_SUPPORTED,
        {
          event: [],
        },
      );
    });
  });
});

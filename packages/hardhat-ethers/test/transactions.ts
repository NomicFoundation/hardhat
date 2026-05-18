import type { HardhatEthers } from "../src/types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { initializeTestEthers, sleep } from "./helpers/helpers.js";

describe("transactions", () => {
  let ethers: HardhatEthers;
  let ethereumProvider: EthereumProvider;

  beforeEach(async () => {
    ({ ethers, provider: ethereumProvider } = await initializeTestEthers());
  });

  it("should wait until a transaction is mined", async () => {
    const [signer] = await ethers.getSigners();

    // send a transaction with automining disabled
    await ethereumProvider.request({
      method: "evm_setAutomine",
      params: [false],
    });
    const tx = await signer.sendTransaction({ to: signer });

    let transactionIsMined = false;
    const transactionMinedPromise = tx.wait().then(() => {
      transactionIsMined = true;
    });

    // .wait() shouldn't resolve if the transaction wasn't mined
    await Promise.race([transactionMinedPromise, sleep(250)]);

    assert.equal(transactionIsMined, false);

    // mine a new block
    await ethereumProvider.request({ method: "hardhat_mine" });

    await transactionMinedPromise;

    assert.equal(transactionIsMined, true);

    // restore automining
    await ethereumProvider.request({
      method: "evm_setAutomine",
      params: [true],
    });
  });

  it("should wait until a transaction has the given number of confirmations", async () => {
    const [signer] = await ethers.getSigners();

    // send a transaction with automining disabled
    await ethereumProvider.request({
      method: "evm_setAutomine",
      params: [false],
    });

    const tx = await signer.sendTransaction({ to: signer });

    let transactionIsMined = false;
    const transactionMinedPromise = tx.wait(10).then(() => {
      transactionIsMined = true;
    });

    // .wait() shouldn't resolve if the transaction wasn't mined
    await Promise.race([transactionMinedPromise, sleep(250)]);
    assert.equal(transactionIsMined, false);

    // mine a new block
    await ethereumProvider.request({ method: "hardhat_mine" });

    // the promise shouldn't be resolved with just one confirmation
    await Promise.race([transactionMinedPromise, sleep(250)]);
    assert.equal(transactionIsMined, false);

    // mine 9 blocks more
    await ethereumProvider.request({
      method: "hardhat_mine",
      params: ["0x9"],
    });

    await transactionMinedPromise;

    assert.equal(transactionIsMined, true);

    // restore automining
    await ethereumProvider.request({
      method: "evm_setAutomine",
      params: [true],
    });
  });

  it("should not wait for a transaction receipt by default", async () => {
    const [signer] = await ethers.getSigners();

    await ethereumProvider.request({
      method: "evm_setAutomine",
      params: [false],
    });

    try {
      const tx = await signer.sendTransaction({ to: signer });

      assert.equal(await ethers.provider.getTransactionReceipt(tx.hash), null);
    } finally {
      await ethereumProvider.request({ method: "hardhat_mine" });
      await ethereumProvider.request({
        method: "evm_setAutomine",
        params: [true],
      });
    }
  });

  it("should wait for a transaction receipt when configured", async () => {
    ({ ethers, provider: ethereumProvider } = await initializeTestEthers([], {
      networks: {
        default: {
          type: "edr-simulated",
          ethers: {
            waitForTransactionReceipts: true,
          },
        },
      },
    }));

    const [signer] = await ethers.getSigners();
    const initialPendingNonce = await ethers.provider.getTransactionCount(
      signer.address,
      "pending",
    );

    await ethereumProvider.request({
      method: "evm_setAutomine",
      params: [false],
    });

    try {
      let transactionWasSent = false;
      let sendTransactionResolved = false;

      const sendTransactionPromise = signer
        .sendTransaction({ to: signer })
        .then((transactionResponse) => {
          sendTransactionResolved = true;
          return transactionResponse;
        });

      for (let i = 0; i < 20; i++) {
        const pendingNonce = await ethers.provider.getTransactionCount(
          signer.address,
          "pending",
        );

        if (pendingNonce === initialPendingNonce + 1) {
          transactionWasSent = true;
          break;
        }

        await sleep(50);
      }

      await Promise.race([sendTransactionPromise, sleep(250)]);
      assert.equal(transactionWasSent, true);
      assert.equal(sendTransactionResolved, false);

      await ethereumProvider.request({ method: "hardhat_mine" });

      const tx = await sendTransactionPromise;

      assert.notEqual(
        await ethers.provider.getTransactionReceipt(tx.hash),
        null,
      );
    } finally {
      await ethereumProvider.request({ method: "hardhat_mine" });
      await ethereumProvider.request({
        method: "evm_setAutomine",
        params: [true],
      });
    }
  });
});

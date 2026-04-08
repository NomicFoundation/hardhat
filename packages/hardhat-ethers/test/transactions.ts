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
});

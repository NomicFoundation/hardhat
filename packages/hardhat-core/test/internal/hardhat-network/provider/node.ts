import { assert } from "chai";
import Common from "ethereumjs-common";
import { FakeTxData } from "ethereumjs-tx";
import FakeTransaction from "ethereumjs-tx/dist/fake";

import { HardhatNode } from "../../../../src/internal/hardhat-network/provider/node";
import { NodeConfig } from "../../../../src/internal/hardhat-network/provider/node-types";
import { EMPTY_ACCOUNT_ADDRESS } from "../helpers/constants";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
  DEFAULT_CHAIN_ID,
  DEFAULT_HARDFORK,
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
} from "../helpers/providers";

describe("HardhatNode", () => {
  const config: NodeConfig = {
    type: "local",
    automine: false,
    hardfork: DEFAULT_HARDFORK,
    networkName: DEFAULT_NETWORK_NAME,
    chainId: DEFAULT_CHAIN_ID,
    networkId: DEFAULT_NETWORK_ID,
    blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
    genesisAccounts: DEFAULT_ACCOUNTS,
  };
  let node: HardhatNode;
  let createTestTransaction: (txData: FakeTxData) => FakeTransaction;

  beforeEach(async () => {
    let common: Common;
    [common, node] = await HardhatNode.create(config);
    createTestTransaction = (txData) => new FakeTransaction(txData, { common });
  });

  describe("mineBlock", () => {
    it("can mine an empty block", async () => {
      const beforeBlock = await node.getLatestBlockNumber();
      await node.mineBlock();
      const currentBlock = await node.getLatestBlockNumber();
      assert.equal(currentBlock.toString(), beforeBlock.addn(1).toString());
    });

    it("can mine a block with one transaction", async () => {
      const tx = createTestTransaction({
        nonce: 0,
        from: DEFAULT_ACCOUNTS_ADDRESSES[0],
        to: EMPTY_ACCOUNT_ADDRESS,
        gasLimit: 21_000,
        value: 1234,
      });
      await node.runTransaction(tx);
      await node.mineBlock();

      const txReceipt = await node.getTransactionReceipt(tx.hash());
      assert.isDefined(txReceipt);
    });
  });
});

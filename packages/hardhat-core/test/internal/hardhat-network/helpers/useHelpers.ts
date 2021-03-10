import { assert } from "chai";

import { numberToRpcQuantity } from "../../../../src/internal/hardhat-network/provider/output";

import { DEFAULT_ACCOUNTS_ADDRESSES } from "./providers";

interface SendTxOptions {
  from?: string;
  to?: string;
  gas?: number;
  gasPrice?: number;
  data?: string;
  nonce?: number;
  value?: number;
}

declare module "mocha" {
  interface Context {
    sendTx: (options?: SendTxOptions) => Promise<string>;
    assertPendingTxs: (txs: string[]) => Promise<void>;
    mine: () => Promise<void>;
  }
}

export function useHelpers() {
  beforeEach("Initialize helpers", async function () {
    if (this.provider === undefined) {
      throw new Error("useHelpers has to be called after useProvider");
    }

    this.sendTx = ({
      from = DEFAULT_ACCOUNTS_ADDRESSES[1],
      to = DEFAULT_ACCOUNTS_ADDRESSES[2],
      gas = 21000,
      gasPrice = 1,
      data,
      nonce,
      value,
    }: SendTxOptions = {}) => {
      return this.provider.send("eth_sendTransaction", [
        {
          from,
          to,
          gas: numberToRpcQuantity(gas),
          gasPrice: numberToRpcQuantity(gasPrice),
          data,
          nonce: nonce !== undefined ? numberToRpcQuantity(nonce) : undefined,
          value: value !== undefined ? numberToRpcQuantity(value) : undefined,
        },
      ]);
    };

    this.assertLatestBlockTxs = async (txs: string[]) => {
      const latestBlock = await this.provider.send("eth_getBlockByNumber", [
        "latest",
        false,
      ]);

      assert.sameMembers(txs, latestBlock.transactions);
    };

    this.assertPendingTxs = async (txs: string[]) => {
      const pendingTxs = await this.provider.send("eth_pendingTransactions");
      const pendingTxsHashes = pendingTxs.map((x: any) => x.hash);

      assert.sameMembers(txs, pendingTxsHashes);
    };

    this.mine = async () => {
      await this.provider.send("evm_mine");
    };
  });

  afterEach("Remove helpers", async function () {
    delete (this as any).sendTx;
  });
}

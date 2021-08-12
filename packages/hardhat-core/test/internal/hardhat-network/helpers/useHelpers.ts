import { assert } from "chai";

import { BN } from "ethereumjs-util";
import {
  numberToRpcQuantity,
  rpcQuantityToBN,
} from "../../../../src/internal/core/jsonrpc/types/base-types";

import { DEFAULT_ACCOUNTS_ADDRESSES } from "./providers";

interface SendTxOptions {
  from?: string;
  to?: string;
  gas?: number;
  gasPrice?: number | BN;
  data?: string;
  nonce?: number;
  value?: number;
}

declare module "mocha" {
  interface Context {
    sendTx: (options?: SendTxOptions) => Promise<string>;
    assertLatestBlockTxs: (txs: string[]) => Promise<void>;
    assertPendingTxs: (txs: string[]) => Promise<void>;
    mine: () => Promise<void>;
  }
}

/**
 * @deprecated
 */
export function useHelpers() {
  beforeEach("Initialize helpers", async function () {
    if (this.provider === undefined) {
      throw new Error("useHelpers has to be called after useProvider");
    }

    this.sendTx = async ({
      from = DEFAULT_ACCOUNTS_ADDRESSES[1],
      to = DEFAULT_ACCOUNTS_ADDRESSES[2],
      gas = 21000,
      gasPrice,
      data,
      nonce,
      value,
    }: SendTxOptions = {}) => {
      const price =
        gasPrice ??
        rpcQuantityToBN(await this.provider.send("eth_gasPrice", []));

      return this.provider.send("eth_sendTransaction", [
        {
          from,
          to,
          gas: numberToRpcQuantity(gas),
          gasPrice: numberToRpcQuantity(price),
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
    delete (this as any).assertLatestBlockTxs;
    delete (this as any).assertPendingTxs;
    delete (this as any).mine;
  });
}

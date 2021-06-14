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
  gasPrice?: number;
  data?: string;
  nonce?: number;
  value?: number;
}

declare module "mocha" {
  interface Context {
    sendTx: (options?: SendTxOptions) => Promise<any>;
    getBaseFeePerGas: (blockNumber: number) => Promise<BN>;
    getLatestBaseFeePerGas: () => Promise<BN>;
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

    this.getBaseFeePerGas = async (blockNumber: number): Promise<BN> => {
      const block = await this.provider.send("eth_getBlockByNumber", [
        numberToRpcQuantity(blockNumber),
        false,
      ]);

      return rpcQuantityToBN(block.baseFeePerGas);
    };

    this.getLatestBaseFeePerGas = async (): Promise<BN> => {
      const block = await this.provider.send("eth_getBlockByNumber", [
        "latest",
        false,
      ]);

      return rpcQuantityToBN(block.baseFeePerGas);
    };
  });

  afterEach("Remove helpers", async function () {
    delete (this as any).sendTx;
    delete (this as any).getBaseFeePerGas;
    delete (this as any).getLatestBaseFeePerGas;
  });
}

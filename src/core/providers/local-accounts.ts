import Transaction from "ethereumjs-tx";
import { EventEmitter } from "events";
import { EthereumProvider } from "web3x/providers";

import { IEthereumProvider } from "./ethereum";
import { WrappedProvider } from "./wrapper";

export class EthereumLocalAccountsProvider extends WrappedProvider {
  constructor(
    provider: IEthereumProvider,
    private accounts: string[] = [],
    private chainId: number
  ) {
    super(provider);
  }

  public async send(method: string, params?: any[]): Promise<any> {
    if (method === "eth_accounts") {
      return this.accounts;
    }

    if (method === "eth_requestAccounts") {
      return this.accounts;
    }

    if (method === "eth_sign") {
      throw new Error("eth_sign is not supported yet");
    }

    if (method === "eth_sendTransaction") {
      if (params === undefined || params.length < 1) {
        throw Error("Missing required parameters");
      }

      const from = params[0];
      const to = params[1];
      const gasLimit = params[2];
      const gasPrice = params[3];
      const value = params[4];
      const data = params[5];
      let nonce = params[6];

      if (gasLimit === undefined || gasPrice === undefined) {
        throw Error("Missing gas");
      }

      if (nonce === undefined) {
        nonce = await this.send("eth_getTransactionCount", [from, "pending"]);
      }
      const chainId = this.chainId;

      // TODO: Remove ethereumjs-tx dependencies in favor to web3x implementations.
      const transaction = new Transaction({
        to,
        gasPrice,
        gasLimit,
        value,
        data,
        nonce,
        chainId
      });
      const signedTx = signTransaction(transaction, this.accounts[0]);

      return this.send("eth_sendRawTransaction", [signedTx]);
    }

    return super.send(method, params);
  }
}

export function signTransaction(tx: any, privateKey: string | Buffer): Buffer {
  tx.sign(
    typeof privateKey === "string" ? Buffer.from(privateKey, "hex") : privateKey
  );
  return tx.serialize();
}

export function hashTransaction(tx: any) {
  return tx.hash(true).toString("hex");
}

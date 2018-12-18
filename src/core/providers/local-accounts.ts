import Transaction from "ethereumjs-tx";
import { EventEmitter } from "events";
import { EthereumProvider } from "web3x/providers";

import { IEthereumProvider } from "./ethereum";
import { wrapSend } from "./wrapper";

export function createLocalAccountsProvider(
  provider: IEthereumProvider,
  accounts: string[] = [],
  chainId: number
) {
  return wrapSend(provider, async (method: string, params?: any[]) => {
    if (method === "eth_accounts") {
      return accounts;
    }

    if (method === "eth_requestAccounts") {
      return accounts;
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
        nonce = await provider.send("eth_getTransactionCount", [
          from,
          "pending"
        ]);
      }

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
      const signedTx = signTransaction(transaction, accounts[0]);

      return provider.send("eth_sendRawTransaction", [signedTx]);
    }

    return provider.send(method, params);
  });
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

import Transaction from "ethereumjs-tx";
import { addHexPrefix, privateToAddress } from "ethereumjs-util";
import { AccountTx } from "web3x/account";

import { IEthereumProvider } from "./ethereum";
import { wrapSend } from "./wrapper";

export function createLocalAccountsProvider(
  provider: IEthereumProvider,
  accounts: string[] = [],
  chainId: number
) {
  const publicKeys: Buffer[] = accounts.map(pk =>
    privateToAddress(Buffer.from(pk, "hex"))
  );

  return wrapSend(provider, async (method: string, params?: any[]) => {
    if (method === "eth_accounts") {
      return publicKeys;
    }

    if (method === "eth_requestAccounts") {
      return publicKeys;
    }

    if (method === "eth_sign") {
      throw new Error("eth_sign is not supported yet");
    }

    if (method === "eth_sendTransaction") {
      if (params === undefined) {
        params = [];
      }

      const tx: AccountTx & { from?: string } = params[0];

      if (tx.gas === undefined || tx.gasPrice === undefined) {
        throw Error("Missing gas");
      }
      if (tx.chainId === undefined) {
        tx.chainId = chainId;
      }
      if (tx.nonce === undefined) {
        tx.nonce = await provider.send("eth_getTransactionCount", [
          tx.from,
          "pending"
        ]);
      }

      // TODO: Remove ethereumjs-tx dependencies in favor to web3x implementations.
      const transaction = new Transaction(tx);

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

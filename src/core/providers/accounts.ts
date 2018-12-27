import Transaction from "ethereumjs-tx";
import { toBuffer } from "ethereumjs-util";
import { Account } from "web3x/account";
import { Tx } from "web3x/eth";
import { bufferToHex } from "web3x/utils";

import { IEthereumProvider } from "./ethereum";
import { wrapSend } from "./wrapper";

export function createLocalAccountsProvider(
  provider: IEthereumProvider,
  privateKeys: string[]
) {
  const accounts: Account[] = privateKeys.map(pkString =>
    Account.fromPrivate(toBuffer(pkString))
  );

  return wrapSend(provider, async (method: string, params: any[]) => {
    if (method === "eth_accounts" || method === "eth_requestAccounts") {
      return accounts.map(acc => acc.address.toLowerCase());
    }

    if (method === "eth_sign") {
      const [address, data] = params;

      if (address !== undefined) {
        if (data === undefined) {
          throw new Error("Missing data param when calling eth_sign");
        }

        const account = accounts.find(
          acc => acc.address.toLowerCase() === address.toLowerCase()
        );

        if (account === undefined) {
          // TODO: Throw a better error
          throw new Error(address + " isn't one of the local accounts");
        }

        return account.sign(data).signature;
      }
    }

    if (method === "eth_sendTransaction" && params.length > 0) {
      const tx: Tx = params[0];

      if (tx.chainId === undefined) {
        throw new Error("Missing chain id");
      }

      if (tx.gas === undefined || tx.gasPrice === undefined) {
        throw new Error("Missing gas info");
      }

      if (tx.nonce === undefined) {
        tx.nonce = await provider.send("eth_getTransactionCount", [
          tx.from,
          "pending"
        ]);
      }

      const account = accounts.find(
        acc => acc.address.toLowerCase() === tx.from!.toLowerCase()
      );

      if (account === undefined) {
        // TODO: Throw a better error
        throw new Error(tx.from + " isn't one of the local accounts");
      }

      // TODO: Remove ethereumjs-tx dependencies in favor of web3x.
      const transaction = new Transaction(tx);
      transaction.sign(account.privateKey);

      return provider.send("eth_sendRawTransaction", [transaction.serialize()]);
    }

    return provider.send(method, params);
  });
}

export function createHDWalletProvider(
  provider: IEthereumProvider,
  mnemonic: string,
  hdpath: string = "m/44'/60'/0'/0/",
  initialIndex: number = 0,
  count: number = 10
) {
  const accounts: Account[] = [];
  for (let i = initialIndex; i < initialIndex + count; i++) {
    accounts.push(Account.createFromMnemonicAndPath(mnemonic, hdpath + i));
  }

  return createLocalAccountsProvider(
    provider,
    accounts.map(account => bufferToHex(account.privateKey))
  );
}

export function createSenderProvider(
  provider: IEthereumProvider,
  from?: string
) {
  let addresses = from === undefined ? undefined : [from];

  return wrapSend(provider, async (method: string, params: any[]) => {
    if (method === "eth_sendTransaction" || method === "eth_call") {
      const tx: Tx = params[0];

      if (tx !== undefined && tx.from === undefined) {
        const [senderAccount] = await getAccounts();

        if (senderAccount !== undefined) {
          tx.from = senderAccount;
        } else if (method === "eth_sendTransaction") {
          throw new Error("No accounts available in the node");
        }
      }
    }

    return provider.send(method, params);
  });

  async function getAccounts(): Promise<string[]> {
    if (addresses !== undefined) {
      return addresses;
    }

    addresses = (await provider.send("eth_accounts")) as string[];
    return addresses;
  }
}

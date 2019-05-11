import { Account } from "web3x/account";
import { Tx } from "web3x/eth";

import { IEthereumProvider } from "../../../types";
import { BuidlerError, ERRORS } from "../errors";

import { wrapSend } from "./wrapper";

const HD_PATH_REGEX = /^m(:?\/\d+'?)+\/?$/;

export function createLocalAccountsProvider(
  provider: IEthereumProvider,
  privateKeys: string[]
) {
  const { bufferToHex, toBuffer } = require("ethereumjs-util");
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
          throw new BuidlerError(ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM);
        }

        const account = accounts.find(
          acc => acc.address.toLowerCase() === address.toLowerCase()
        );

        if (account === undefined) {
          throw new BuidlerError(ERRORS.NETWORK.NOT_LOCAL_ACCOUNT, address);
        }

        return account.sign(data).signature;
      }
    }

    if (method === "eth_sendTransaction" && params.length > 0) {
      const tx: Tx = params[0];

      if (tx.chainId === undefined) {
        throw new BuidlerError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          "chainId"
        );
      }

      if (tx.gas === undefined) {
        throw new BuidlerError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          "gas"
        );
      }

      if (tx.gasPrice === undefined) {
        throw new BuidlerError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          "gasPrice"
        );
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
        throw new BuidlerError(ERRORS.NETWORK.NOT_LOCAL_ACCOUNT, tx.from);
      }

      const { default: Transaction } = await import("ethereumjs-tx");
      const transaction = new Transaction(tx);
      transaction.sign(account.privateKey);

      return provider.send("eth_sendRawTransaction", [
        bufferToHex(transaction.serialize())
      ]);
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
  if (hdpath.match(HD_PATH_REGEX) === null) {
    throw new BuidlerError(ERRORS.NETWORK.INVALID_HD_PATH, hdpath);
  }

  if (!hdpath.endsWith("/")) {
    hdpath += "/";
  }

  const accounts: Account[] = [];
  for (let i = initialIndex; i < initialIndex + count; i++) {
    accounts.push(
      Account.createFromMnemonicAndPath(mnemonic, hdpath + i.toString())
    );
  }

  const { bufferToHex } = require("ethereumjs-util");

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
          throw new BuidlerError(ERRORS.NETWORK.NO_REMOTE_ACCOUNT_AVAILABLE);
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

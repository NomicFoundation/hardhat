import { Transaction as TransactionT } from "ethereumjs-tx";

import { IEthereumProvider } from "../../../types";
import { deriveKeyFromMnemonicAndPath } from "../../util/keys-derivation";
import { BuidlerError } from "../errors";
import { ERRORS } from "../errors-list";

import { createChainIdGetter } from "./provider-utils";
import { wrapSend } from "./wrapper";

// This library's types are wrong, they don't type check
// tslint:disable-next-line no-var-requires
const ethSigUtil = require("eth-sig-util");

export interface JsonRpcTransactionData {
  from?: string;
  to?: string;
  gas?: string | number;
  gasPrice?: string | number;
  value?: string | number;
  data?: string;
  nonce?: string | number;
}

const HD_PATH_REGEX = /^m(:?\/\d+'?)+\/?$/;

export function createLocalAccountsProvider(
  provider: IEthereumProvider,
  hexPrivateKeys: string[]
) {
  const {
    bufferToHex,
    toBuffer,
    privateToAddress,
  } = require("ethereumjs-util");

  const privateKeys = hexPrivateKeys.map((h) => toBuffer(h));
  const addresses = privateKeys.map((pk) => bufferToHex(privateToAddress(pk)));

  const getChainId = createChainIdGetter(provider);

  function getPrivateKey(address: string): Buffer | undefined {
    for (let i = 0; i < address.length; i++) {
      if (addresses[i] === address.toLowerCase()) {
        return privateKeys[i];
      }
    }
  }

  return wrapSend(provider, async (method: string, params: any[]) => {
    const { ecsign, hashPersonalMessage, toRpcSig } = await import(
      "ethereumjs-util"
    );

    if (method === "eth_accounts" || method === "eth_requestAccounts") {
      return [...addresses];
    }

    if (method === "eth_sign") {
      const [address, data] = params;

      if (address !== undefined) {
        if (data === undefined) {
          throw new BuidlerError(ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM);
        }

        const privateKey = getPrivateKey(address);

        if (privateKey === undefined) {
          throw new BuidlerError(ERRORS.NETWORK.NOT_LOCAL_ACCOUNT, {
            account: address,
          });
        }

        const messageHash = hashPersonalMessage(toBuffer(data));

        const signature = ecsign(messageHash, privateKey);
        return toRpcSig(signature.v, signature.r, signature.s);
      }
    }

    if (method === "eth_signTypedData") {
      const [address, data] = params;

      if (address !== undefined) {
        if (data === undefined) {
          throw new BuidlerError(ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM);
        }

        const privateKey = getPrivateKey(address);

        if (privateKey === undefined) {
          throw new BuidlerError(ERRORS.NETWORK.NOT_LOCAL_ACCOUNT, {
            account: address,
          });
        }

        return ethSigUtil.signTypedData_v4(privateKey, {
          data,
        });
      }
    }

    if (method === "eth_sendTransaction" && params.length > 0) {
      const tx: JsonRpcTransactionData = params[0];

      if (tx.gas === undefined) {
        throw new BuidlerError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "gas" }
        );
      }

      if (tx.gasPrice === undefined) {
        throw new BuidlerError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "gasPrice" }
        );
      }

      if (tx.nonce === undefined) {
        tx.nonce = await provider.send("eth_getTransactionCount", [
          tx.from,
          "pending",
        ]);
      }

      const privateKey = getPrivateKey(tx.from!);

      if (privateKey === undefined) {
        throw new BuidlerError(ERRORS.NETWORK.NOT_LOCAL_ACCOUNT, {
          account: tx.from,
        });
      }

      const chainId = await getChainId();

      const rawTransaction = await getSignedTransaction(
        tx,
        chainId,
        privateKey
      );

      return provider.send("eth_sendRawTransaction", [
        bufferToHex(rawTransaction),
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
    throw new BuidlerError(ERRORS.NETWORK.INVALID_HD_PATH, { path: hdpath });
  }

  if (!hdpath.endsWith("/")) {
    hdpath += "/";
  }

  const privateKeys: Buffer[] = [];

  for (let i = initialIndex; i < initialIndex + count; i++) {
    const privateKey = deriveKeyFromMnemonicAndPath(
      mnemonic,
      hdpath + i.toString()
    );

    if (privateKey === undefined) {
      throw new BuidlerError(ERRORS.NETWORK.CANT_DERIVE_KEY, {
        mnemonic,
        path: hdpath,
      });
    }

    privateKeys.push(privateKey);
  }

  const { bufferToHex } = require("ethereumjs-util");

  return createLocalAccountsProvider(
    provider,
    privateKeys.map((pk) => bufferToHex(pk))
  );
}

export function createSenderProvider(
  provider: IEthereumProvider,
  from?: string
) {
  let addresses = from === undefined ? undefined : [from];

  return wrapSend(provider, async (method: string, params: any[]) => {
    if (
      method === "eth_sendTransaction" ||
      method === "eth_call" ||
      method === "eth_estimateGas"
    ) {
      const tx: JsonRpcTransactionData = params[0];

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

async function getSignedTransaction(
  tx: JsonRpcTransactionData,
  chainId: number,
  privateKey: Buffer
): Promise<Buffer> {
  const chains = require("ethereumjs-common/dist/chains");

  const { Transaction } = await import("ethereumjs-tx");
  let transaction: TransactionT;

  if (chains.chains.names[chainId] !== undefined) {
    transaction = new Transaction(tx, { chain: chainId });
  } else {
    const { default: Common } = await import("ethereumjs-common");

    const common = Common.forCustomChain(
      "mainnet",
      {
        chainId,
        networkId: chainId,
      },
      "istanbul"
    );

    transaction = new Transaction(tx, { common });
  }

  transaction.sign(privateKey);

  return transaction.serialize();
}

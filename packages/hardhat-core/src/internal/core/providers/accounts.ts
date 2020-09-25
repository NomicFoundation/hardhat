import { Transaction as TransactionT } from "ethereumjs-tx";

import { EIP1193Provider, RequestArguments } from "../../../types";
import { HardhatError } from "../errors";
import { ERRORS } from "../errors-list";

import { ProviderWrapperWithChainId } from "./chainId";
import { derivePrivateKeys } from "./util";
import { ProviderWrapper } from "./wrapper";

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

export class LocalAccountsProvider extends ProviderWrapperWithChainId {
  private _addressToPrivateKey: Map<string, Buffer> = new Map();

  constructor(
    provider: EIP1193Provider,
    localAccountsHexPrivateKeys: string[]
  ) {
    super(provider);

    this._initializePrivateKeys(localAccountsHexPrivateKeys);
  }

  public async request(args: RequestArguments): Promise<unknown> {
    const {
      ecsign,
      hashPersonalMessage,
      toRpcSig,
      toBuffer,
      bufferToHex,
    } = await import("ethereumjs-util");

    if (
      args.method === "eth_accounts" ||
      args.method === "eth_requestAccounts"
    ) {
      return [...this._addressToPrivateKey.keys()];
    }

    const params = this._getParams(args);

    if (args.method === "eth_sign") {
      const [address, data] = params;

      if (address !== undefined) {
        if (data === undefined) {
          throw new HardhatError(ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM);
        }

        const privateKey = this._getPrivateKeyForAddress(address);
        const messageHash = hashPersonalMessage(toBuffer(data));
        const signature = ecsign(messageHash, privateKey);
        return toRpcSig(signature.v, signature.r, signature.s);
      }
    }

    if (args.method === "eth_signTypedData") {
      const [address, data] = params;

      if (address !== undefined) {
        if (data === undefined) {
          throw new HardhatError(ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM);
        }

        const privateKey = this._getPrivateKeyForAddress(address);
        return ethSigUtil.signTypedData_v4(privateKey, {
          data,
        });
      }
    }

    if (args.method === "eth_sendTransaction" && params.length > 0) {
      const tx: JsonRpcTransactionData = params[0];

      if (tx.gas === undefined) {
        throw new HardhatError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "gas" }
        );
      }

      if (tx.from === undefined) {
        throw new HardhatError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "from" }
        );
      }

      if (tx.gasPrice === undefined) {
        throw new HardhatError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "gasPrice" }
        );
      }

      if (tx.nonce === undefined) {
        tx.nonce = await this._getNonceAsQuantity(tx.from);
      }

      const privateKey = this._getPrivateKeyForAddress(tx.from!);

      const chainId = await this._getChainId();

      const rawTransaction = await this._getSignedTransaction(
        tx,
        chainId,
        privateKey
      );

      return this._wrappedProvider.request({
        method: "eth_sendRawTransaction",
        params: [bufferToHex(rawTransaction)],
      });
    }

    return this._wrappedProvider.request(args);
  }

  private _initializePrivateKeys(localAccountsHexPrivateKeys: string[]) {
    const {
      bufferToHex,
      toBuffer,
      privateToAddress,
    } = require("ethereumjs-util");

    const privateKeys: Buffer[] = localAccountsHexPrivateKeys.map((h) =>
      toBuffer(h)
    );

    for (const pk of privateKeys) {
      const address: string = bufferToHex(privateToAddress(pk)).toLowerCase();
      this._addressToPrivateKey.set(address, pk);
    }
  }

  private _getPrivateKeyForAddress(address: string): Buffer {
    const pk = this._addressToPrivateKey.get(address.toLowerCase());
    if (pk === undefined) {
      throw new HardhatError(ERRORS.NETWORK.NOT_LOCAL_ACCOUNT, {
        account: address,
      });
    }

    return pk;
  }

  private async _getNonceAsQuantity(address: string): Promise<string> {
    return (await this._wrappedProvider.request({
      method: "eth_getTransactionCount",
      params: [address, "pending"],
    })) as string;
  }

  private async _getSignedTransaction(
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
}

export class HDWalletProvider extends LocalAccountsProvider {
  constructor(
    provider: EIP1193Provider,
    mnemonic: string,
    hdpath: string = "m/44'/60'/0'/0/",
    initialIndex: number = 0,
    count: number = 10
  ) {
    const privateKeys = derivePrivateKeys(
      mnemonic,
      hdpath,
      initialIndex,
      count
    );

    const { bufferToHex } = require("ethereumjs-util");
    const privateKeysAsHex = privateKeys.map((pk) => bufferToHex(pk));
    super(provider, privateKeysAsHex);
  }
}

abstract class SenderProvider extends ProviderWrapper {
  public async request(args: RequestArguments): Promise<unknown> {
    const method = args.method;
    const params = this._getParams(args);

    if (
      method === "eth_sendTransaction" ||
      method === "eth_call" ||
      method === "eth_estimateGas"
    ) {
      const tx: JsonRpcTransactionData = params[0];

      if (tx !== undefined && tx.from === undefined) {
        const senderAccount = await this._getSender();

        if (senderAccount !== undefined) {
          tx.from = senderAccount;
        } else if (method === "eth_sendTransaction") {
          throw new HardhatError(ERRORS.NETWORK.NO_REMOTE_ACCOUNT_AVAILABLE);
        }
      }
    }

    return this._wrappedProvider.request(args);
  }

  protected abstract async _getSender(): Promise<string | undefined>;
}

export class AutomaticSenderProvider extends SenderProvider {
  private _firstAccount: string | undefined;

  protected async _getSender(): Promise<string | undefined> {
    if (this._firstAccount === undefined) {
      const accounts = (await this._wrappedProvider.request({
        method: "eth_accounts",
      })) as string[];

      this._firstAccount = accounts[0];
    }

    return this._firstAccount;
  }
}

export class FixedSenderProvider extends SenderProvider {
  constructor(provider: EIP1193Provider, private readonly _sender: string) {
    super(provider);
  }

  protected async _getSender(): Promise<string | undefined> {
    return this._sender;
  }
}

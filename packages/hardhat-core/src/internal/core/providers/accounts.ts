import { BN } from "ethereumjs-util";
import * as t from "io-ts";

import { FeeMarketEIP1559Transaction } from "@ethereumjs/tx";
import { EIP1193Provider, RequestArguments } from "../../../types";
import { HardhatError } from "../errors";
import { ERRORS } from "../errors-list";
import {
  rpcAddress,
  rpcData,
  rpcQuantityToBN,
} from "../jsonrpc/types/base-types";
import {
  RpcTransactionRequest,
  rpcTransactionRequest,
} from "../jsonrpc/types/input/transactionRequest";
import { validateParams } from "../jsonrpc/types/input/validation";

import { ProviderWrapperWithChainId } from "./chainId";
import { derivePrivateKeys } from "./util";
import { ProviderWrapper } from "./wrapper";

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
    const { ecsign, hashPersonalMessage, toRpcSig, toBuffer, bufferToHex } =
      await import("ethereumjs-util");

    if (
      args.method === "eth_accounts" ||
      args.method === "eth_requestAccounts"
    ) {
      return [...this._addressToPrivateKey.keys()];
    }

    const params = this._getParams(args);

    if (args.method === "eth_sign") {
      if (params.length > 0) {
        const [address, data] = validateParams(params, rpcAddress, rpcData);

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
    }

    if (args.method === "personal_sign") {
      if (params.length > 0) {
        const [data, address] = validateParams(params, rpcData, rpcAddress);

        if (data !== undefined) {
          if (address === undefined) {
            throw new HardhatError(
              ERRORS.NETWORK.PERSONALSIGN_MISSING_ADDRESS_PARAM
            );
          }

          const privateKey = this._getPrivateKeyForAddress(address);
          const messageHash = hashPersonalMessage(toBuffer(data));
          const signature = ecsign(messageHash, privateKey);
          return toRpcSig(signature.v, signature.r, signature.s);
        }
      }
    }

    if (args.method === "eth_signTypedData_v4") {
      const [address, data] = validateParams(params, rpcAddress, t.any);

      if (data === undefined) {
        throw new HardhatError(ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM);
      }

      let typedMessage = data;
      if (typeof data === "string") {
        try {
          typedMessage = JSON.parse(data);
        } catch {
          throw new HardhatError(
            ERRORS.NETWORK.ETHSIGN_TYPED_DATA_V4_INVALID_DATA_PARAM
          );
        }
      }

      // if we don't manage the address, the method is forwarded
      const privateKey = this._getPrivateKeyForAddressOrNull(address);
      if (privateKey !== null) {
        return ethSigUtil.signTypedData_v4(privateKey, {
          data: typedMessage,
        });
      }
    }

    if (args.method === "eth_sendTransaction" && params.length > 0) {
      const [txRequest] = validateParams(params, rpcTransactionRequest);

      if (txRequest.gas === undefined) {
        throw new HardhatError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "gas" }
        );
      }

      if (txRequest.from === undefined) {
        throw new HardhatError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "from" }
        );
      }

      const hasGasPrice = txRequest.gasPrice !== undefined;
      const hasEip1559Fields =
        txRequest.maxFeePerGas !== undefined ||
        txRequest.maxPriorityFeePerGas !== undefined;

      if (!hasGasPrice && !hasEip1559Fields) {
        throw new HardhatError(ERRORS.NETWORK.MISSING_FEE_PRICE_FIELDS);
      }

      if (hasGasPrice && hasEip1559Fields) {
        throw new HardhatError(ERRORS.NETWORK.INCOMPATIBLE_FEE_PRICE_FIELDS);
      }

      if (hasEip1559Fields && txRequest.maxFeePerGas === undefined) {
        throw new HardhatError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "maxFeePerGas" }
        );
      }

      if (hasEip1559Fields && txRequest.maxPriorityFeePerGas === undefined) {
        throw new HardhatError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "maxPriorityFeePerGas" }
        );
      }

      if (txRequest.nonce === undefined) {
        txRequest.nonce = await this._getNonce(txRequest.from);
      }

      const privateKey = this._getPrivateKeyForAddress(txRequest.from!);

      const chainId = await this._getChainId();

      const rawTransaction = await this._getSignedTransaction(
        txRequest,
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

  private _getPrivateKeyForAddress(address: Buffer): Buffer {
    const { bufferToHex } = require("ethereumjs-util");
    const pk = this._addressToPrivateKey.get(bufferToHex(address));
    if (pk === undefined) {
      throw new HardhatError(ERRORS.NETWORK.NOT_LOCAL_ACCOUNT, {
        account: bufferToHex(address),
      });
    }

    return pk;
  }

  private _getPrivateKeyForAddressOrNull(address: Buffer): Buffer | null {
    try {
      return this._getPrivateKeyForAddress(address);
    } catch {
      return null;
    }
  }

  private async _getNonce(address: Buffer): Promise<BN> {
    const { bufferToHex } = await import("ethereumjs-util");

    const response = (await this._wrappedProvider.request({
      method: "eth_getTransactionCount",
      params: [bufferToHex(address), "pending"],
    })) as string;

    return rpcQuantityToBN(response);
  }

  private async _getSignedTransaction(
    transactionRequest: RpcTransactionRequest,
    chainId: number,
    privateKey: Buffer
  ): Promise<Buffer> {
    const { chains } = await import("@ethereumjs/common/dist/chains");

    const { AccessListEIP2930Transaction, Transaction } = await import(
      "@ethereumjs/tx"
    );

    const { default: Common } = await import("@ethereumjs/common");

    const txData = {
      ...transactionRequest,
      gasLimit: transactionRequest.gas,
    };

    // TODO: consider changing instances of "london" below to ["latest hardfork"]
    const common =
      chains.names[chainId] !== undefined
        ? new Common({ chain: chainId, hardfork: "london" })
        : Common.forCustomChain(
            "mainnet",
            {
              chainId,
              networkId: chainId,
            },
            "london"
          );

    // we convert the access list to the type
    // that AccessListEIP2930Transaction expects
    const accessList = txData.accessList?.map(
      ({ address, storageKeys }) => [address, storageKeys] as [Buffer, Buffer[]]
    );

    let transaction;
    if (txData.maxFeePerGas !== undefined) {
      transaction = FeeMarketEIP1559Transaction.fromTxData(
        {
          ...txData,
          accessList,
          gasPrice: undefined,
        },
        { common }
      );
    } else if (accessList !== undefined) {
      transaction = AccessListEIP2930Transaction.fromTxData(
        {
          ...txData,
          accessList,
        },
        { common }
      );
    } else {
      transaction = Transaction.fromTxData(txData, { common });
    }

    const signedTransaction = transaction.sign(privateKey);

    return signedTransaction.serialize();
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
      // TODO: Should we validate this type?
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

  protected abstract _getSender(): Promise<string | undefined>;
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

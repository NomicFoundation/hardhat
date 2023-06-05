import { ethers } from "ethers";

import { isEIP712Message, ledgerService } from "@ledgerhq/hw-app-eth";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { EIP712Message } from "@ledgerhq/hw-app-eth/lib/modules/EIP712";
import { TransportError } from "@ledgerhq/errors";

import * as t from "io-ts";

import { EIP1193Provider, RequestArguments } from "hardhat/types";

import { validateParams } from "hardhat/internal/core/jsonrpc/types/input/validation";
import { rpcTransactionRequest } from "hardhat/internal/core/jsonrpc/types/input/transactionRequest";
import {
  rpcAddress,
  rpcData,
  rpcQuantityToBigInt,
} from "hardhat/internal/core/jsonrpc/types/base-types";
import { ProviderWrapperWithChainId } from "hardhat/src/internal/core/providers/chainId";
import { HardhatError } from "hardhat/src/internal/core/errors";
import { ERRORS } from "hardhat/src/internal/core/errors-list";

import { LedgerOptions, EthWrapper, Signature } from "./types";
import { LedgerProviderError } from "./errors";
import { wrapTransport } from "./internal/wrap-transport";

export class LedgerProvider extends ProviderWrapperWithChainId {
  public static readonly MAX_DERIVATION_ACCOUNTS = 20;
  public static readonly DEFAULT_TIMEOUT = 3000;

  public name: string = "LedgerProvider";
  public readonly paths: Record<string, string> = {}; // { address: path }

  protected _eth: EthWrapper | undefined;
  private _isCreatingTransport = false;

  static async create(
    options: LedgerOptions,
    _wrappedProvider: EIP1193Provider
  ) {
    const provider = new LedgerProvider(options, _wrappedProvider);
    await provider.init();
    return provider;
  }

  constructor(
    public readonly options: LedgerOptions,
    protected readonly _wrappedProvider: EIP1193Provider
  ) {
    super(_wrappedProvider);

    if (options.accounts.length === 0) {
      throw new LedgerProviderError(
        "You tried to initialize a LedgerProvider without supplying any account to the constructor. The provider cannot make any requests on the ledger behalf without an account."
      );
    }

    this.options.accounts = options.accounts.map((account) =>
      account.toLowerCase()
    );
  }

  public get eth(): EthWrapper {
    if (this._eth === undefined) {
      throw new HardhatError(ERRORS.GENERAL.UNINITIALIZED_PROVIDER);
    }
    return this._eth;
  }

  public async init(): Promise<void> {
    if (this._eth === undefined && this._isCreatingTransport === false) {
      this._isCreatingTransport = true;

      const openTimeout =
        this.options.openTimeout || LedgerProvider.DEFAULT_TIMEOUT;
      const connectionTimeout =
        this.options.connectionTimeout || LedgerProvider.DEFAULT_TIMEOUT;

      try {
        const transport = await TransportNodeHid.create(
          openTimeout,
          connectionTimeout
        );
        this._eth = wrapTransport(transport);
      } catch (error) {
        if (error instanceof Error) {
          let errorMessage = `There was an error trying to stablish a connection to the Ledger wallet: "${error.message}".`;

          if (error.name === "TransportError") {
            const transportError = error as TransportError;
            errorMessage += ` The error id was: ${transportError.id}`;
          }
          throw new LedgerProviderError(errorMessage);
        }

        throw error;
      }
      this._isCreatingTransport = false;
    }
  }

  public async request(args: RequestArguments): Promise<unknown> {
    const params = this._getParams(args);

    if (
      args.method === "eth_accounts" ||
      args.method === "eth_requestAccounts"
    ) {
      return this.options.accounts;
    }

    if (this._methodRequiresInit(args.method)) {
      await this.init();
    }

    if (args.method === "eth_sign") {
      return this._ethSign(params);
    }

    if (args.method === "personal_sign") {
      return this._personalSign(params);
    }

    if (args.method === "eth_signTypedData_v4") {
      return this._ethSignTypedDataV4(params);
    }

    if (args.method === "eth_sendTransaction" && params.length > 0) {
      return this._ethSendTransaction(params);
    }

    return this._wrappedProvider.request(args);
  }

  private async _derivePath(addressToFindAsBuffer: Buffer): Promise<string> {
    const addressToFind = this._toHex(addressToFindAsBuffer).toLowerCase();

    if (this.paths[addressToFind]) {
      return this.paths[addressToFind];
    }

    for (
      let account = 0;
      account <= LedgerProvider.MAX_DERIVATION_ACCOUNTS;
      account++
    ) {
      const path = `44'/60'/${account}'/0'/0`;

      const wallet = await this.eth.getAddress(path);
      const address = wallet.address.toLowerCase();

      if (address === addressToFind) {
        // TODO: Cache this in the cache directory
        this.paths[addressToFind] = path;
        return path;
      }
    }

    throw new LedgerProviderError(
      `Could not find a valid derivation path for ${addressToFind}. Paths from m/44'/60'/0/0'/0 to m/44'/60'/${LedgerProvider.MAX_DERIVATION_ACCOUNTS}/0'/0 were searched.`
    );
  }

  private _methodRequiresInit(method: string): boolean {
    return [
      "personal_sign",
      "eth_sign",
      "eth_signTypedData_v4",
      "eth_sendTransaction",
    ].includes(method);
  }

  private async _ethSign(params: any[]): Promise<unknown> {
    if (params.length > 0) {
      const [address, data] = validateParams(params, rpcAddress, rpcData);

      if (address !== undefined) {
        if (data === undefined) {
          throw new HardhatError(ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM);
        }

        if (this._isControlledAddress(address)) {
          const path = await this._derivePath(address);
          const signature = await this.eth.signPersonalMessage(
            path,
            data.toString("hex")
          );

          return await this._toRpcSig(signature);
        }
      }
    }
  }

  private async _personalSign(params: any[]): Promise<unknown> {
    if (params.length > 0) {
      const [data, address] = validateParams(params, rpcData, rpcAddress);

      if (data !== undefined) {
        if (address === undefined) {
          throw new HardhatError(
            ERRORS.NETWORK.PERSONALSIGN_MISSING_ADDRESS_PARAM
          );
        }

        if (this._isControlledAddress(address)) {
          const path = await this._derivePath(address);
          const signature = await this.eth.signPersonalMessage(
            path,
            data.toString("hex")
          );

          return await this._toRpcSig(signature);
        }
      }
    }
  }

  private async _ethSignTypedDataV4(params: any[]): Promise<unknown> {
    const [address, data] = validateParams(params, rpcAddress, t.any as any);

    if (data === undefined) {
      throw new HardhatError(ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM);
    }

    let typedMessage: EIP712Message;
    try {
      typedMessage = typeof data === "string" ? JSON.parse(data) : data;

      if (!isEIP712Message(typedMessage)) {
        throw new HardhatError(
          ERRORS.NETWORK.ETHSIGN_TYPED_DATA_V4_INVALID_DATA_PARAM
        );
      }
    } catch {
      throw new HardhatError(
        ERRORS.NETWORK.ETHSIGN_TYPED_DATA_V4_INVALID_DATA_PARAM
      );
    }

    // If we don't manage the address, the method is forwarded
    if (this._isControlledAddress(address)) {
      const { types, domain, message, primaryType } = typedMessage;
      const { EIP712Domain, ...structTypes } = types;

      const path = await this._derivePath(address);

      let signature: { v: number; s: string; r: string };
      try {
        signature = await this.eth.signEIP712Message(path, typedMessage);
      } catch (error) {
        signature = await this.eth.signEIP712HashedMessage(
          path,
          ethers.utils._TypedDataEncoder.hashDomain(domain),
          ethers.utils._TypedDataEncoder.hashStruct(
            primaryType,
            structTypes,
            message
          )
        );
      }

      return await this._toRpcSig(signature);
    }
  }

  private async _ethSendTransaction(params: any[]): Promise<unknown> {
    const [txRequest] = validateParams(params, rpcTransactionRequest);

    if (txRequest.gas === undefined) {
      throw new HardhatError(ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY, {
        param: "gas",
      });
    }

    if (txRequest.from === undefined) {
      throw new HardhatError(ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY, {
        param: "from",
      });
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
      throw new HardhatError(ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY, {
        param: "maxFeePerGas",
      });
    }

    if (hasEip1559Fields && txRequest.maxPriorityFeePerGas === undefined) {
      throw new HardhatError(ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY, {
        param: "maxPriorityFeePerGas",
      });
    }

    // If we don't manage the address, the method is forwarded
    if (this._isControlledAddress(txRequest.from)) {
      const path = await this._derivePath(txRequest.from);

      if (txRequest.nonce === undefined) {
        txRequest.nonce = await this._getNonce(txRequest.from);
      }

      const chainId = await this._getChainId();

      const baseTx: ethers.utils.UnsignedTransaction = {
        chainId,
        data: txRequest.data,
        gasLimit: txRequest.gas,
        gasPrice: txRequest.gasPrice,
        nonce: Number(txRequest.nonce),
        value: txRequest.value,
      };
      if (txRequest.to) {
        baseTx.to = this._toHex(txRequest.to);
      }

      const txToSign = ethers.utils.serializeTransaction(baseTx).substring(2);

      const resolution = await ledgerService.resolveTransaction(
        txToSign,
        {},
        {}
      );

      const signature = await this.eth.signTransaction(
        path,
        txToSign,
        resolution
      );

      const rawTransaction = ethers.utils.serializeTransaction(baseTx, {
        v: ethers.BigNumber.from(this._toHex(signature.v)).toNumber(),
        r: this._toHex(signature.r),
        s: this._toHex(signature.s),
      });

      return this._wrappedProvider.request({
        method: "eth_sendRawTransaction",
        params: [rawTransaction],
      });
    }
  }

  private async _toRpcSig(signature: Signature): Promise<string> {
    const { toRpcSig, toBuffer } = await import(
      "@nomicfoundation/ethereumjs-util"
    );

    return toRpcSig(
      BigInt(signature.v - 27),
      toBuffer(this._toHex(signature.r)),
      toBuffer(this._toHex(signature.s))
    );
  }

  private async _getNonce(address: Buffer): Promise<bigint> {
    const { bufferToHex } = await import("@nomicfoundation/ethereumjs-util");

    const response = (await this._wrappedProvider.request({
      method: "eth_getTransactionCount",
      params: [bufferToHex(address), "pending"],
    })) as string;

    return rpcQuantityToBigInt(response);
  }

  private _isControlledAddress(address: Buffer): boolean {
    return this.options.accounts.includes(this._toHex(address).toLowerCase());
  }

  private _toHex(value: string | Buffer) {
    const stringValue =
      typeof value === "string" ? value : value.toString("hex");

    return "0x" + stringValue;
  }
}

import { ethers } from "ethers";

import Eth, { isEIP712Message, ledgerService } from "@ledgerhq/hw-app-eth";
import { EIP712Message } from "@ledgerhq/hw-app-eth/lib/modules/EIP712";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
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
import {
  HardhatError,
  NomicLabsHardhatPluginError,
} from "hardhat/src/internal/core/errors";
import { ERRORS } from "hardhat/src/internal/core/errors-list";

import { LedgerOptions, Signature } from "./types";

export class LedgerProvider extends ProviderWrapperWithChainId {
  public static readonly DEFAULT_TIMEOUT = 3000;

  public name: string = "LedgerProvider";

  private _eth: Eth | undefined;
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
  }

  public get eth(): Eth {
    if (this._eth === undefined) {
      throw new HardhatError(ERRORS.GENERAL.UNINITIALIZED_PROVIDER);
    }
    return this._eth;
  }

  public async init() {
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
        this._eth = new Eth(transport);
      } catch (error) {
        if (error instanceof Error) {
          let errorMessage = `There was an error trying to stablish a connection to the Ledger wallet: "${error.message}".`;

          if (error.name === "TransportError") {
            const transportError = error as TransportError;
            errorMessage += ` The error id was: ${transportError.id}`;
          }
          throw new NomicLabsHardhatPluginError(
            "@nomiclabs/hardhat-ledger",
            errorMessage
          );
        }

        throw error;
      }
      this._isCreatingTransport = false;
    }
  }

  public async request(args: RequestArguments): Promise<unknown> {
    const params = this._getParams(args);

    if (this._eth === undefined) {
      throw new HardhatError(ERRORS.GENERAL.UNINITIALIZED_PROVIDER);
    }

    if (
      args.method === "eth_accounts" ||
      args.method === "eth_requestAccounts"
    ) {
      const wallet = await this._eth.getAddress(this.options.path);
      return [wallet.address];
    }

    if (args.method === "personal_sign" || args.method === "eth_sign") {
      if (params.length > 0) {
        let data: Buffer;
        let address: Buffer;

        if (args.method === "personal_sign") {
          const validParams = validateParams(params, rpcData, rpcAddress);
          data = validParams[0];
          address = validParams[1];
        } else {
          // eth_sign
          const validParams = validateParams(params, rpcAddress, rpcData);
          data = validParams[1];
          address = validParams[0];
        }

        if (data !== undefined) {
          if (address === undefined) {
            throw new HardhatError(
              ERRORS.NETWORK.PERSONALSIGN_MISSING_ADDRESS_PARAM
            );
          }

          const signature = await this._eth.signPersonalMessage(
            this.options.path,
            data.toString("hex")
          );

          return await this._toRpcSig(signature);
        }
      }
    }

    if (args.method === "eth_signTypedData_v4") {
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
      if (await this._isControlledAddress(address)) {
        const { types, domain, message, primaryType } = typedMessage;
        const { EIP712Domain, ...structTypes } = types;

        let signature;

        try {
          console.log("here");
          signature = await this._eth.signEIP712Message(
            this.options.path,
            typedMessage
          );
        } catch (error) {
          signature = await this._eth.signEIP712HashedMessage(
            this.options.path,
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

      // If we don't manage the address, the method is forwarded
      if (await this._isControlledAddress(txRequest.from)) {
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
        const signature = await this._eth.signTransaction(
          this.options.path,
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

    return this._wrappedProvider.request(args);
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

  private async _isControlledAddress(address: Buffer): Promise<boolean> {
    const [controlledAddress] = (await this.request({
      method: "eth_accounts",
    })) as string[];

    return (
      controlledAddress.toLowerCase() === this._toHex(address).toLowerCase()
    );
  }

  private _toHex(value: string | Buffer) {
    const stringValue =
      typeof value === "string" ? value : value.toString("hex");

    return "0x" + stringValue;
  }
}

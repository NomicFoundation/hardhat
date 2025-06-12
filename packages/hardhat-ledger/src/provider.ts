import { ethers } from "ethers";
import * as t from "io-ts";

import { isValidAddress } from "@ethereumjs/util";

import { isEIP712Message, ledgerService } from "@ledgerhq/hw-app-eth";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { EIP712Message } from "@ledgerhq/hw-app-eth/lib/modules/EIP712";
import { EIP1193Provider, RequestArguments } from "hardhat/types";
import { validateParams } from "hardhat/internal/core/jsonrpc/types/input/validation";
import { rpcTransactionRequest } from "hardhat/internal/core/jsonrpc/types/input/transactionRequest";
import {
  rpcAddress,
  rpcData,
  rpcQuantityToBigInt,
} from "hardhat/internal/core/jsonrpc/types/base-types";
import { ProviderWrapperWithChainId } from "hardhat/internal/core/providers/chainId";
import { HardhatError } from "hardhat/internal/core/errors";
import { ERRORS } from "hardhat/internal/core/errors-list";

import * as cache from "./internal/cache";
import { toHex } from "./internal/utils";
import { wrapTransport } from "./internal/wrap-transport";
import { LedgerOptions, EthWrapper, Signature, Paths } from "./types";
import {
  HardhatLedgerConnectionError,
  HardhatLedgerDerivationPathError,
  HardhatLedgerError,
  HardhatLedgerNotControlledAddressError,
} from "./errors";

export class LedgerProvider extends ProviderWrapperWithChainId {
  public static readonly MAX_DERIVATION_ACCOUNTS = 20;
  public static readonly DEFAULT_TIMEOUT = 3000;

  public readonly paths: Paths = {}; // { address: path }
  public name: string = "LedgerProvider";
  public isOutputEnabled: boolean = true;

  protected _eth: EthWrapper | undefined;

  public static async create(
    options: LedgerOptions,
    wrappedProvider: EIP1193Provider
  ) {
    const provider = new LedgerProvider(options, wrappedProvider);
    await provider.init();
    return provider;
  }

  constructor(
    public readonly options: LedgerOptions,
    _wrappedProvider: EIP1193Provider
  ) {
    super(_wrappedProvider);

    this.options.accounts = options.accounts.map((account) => {
      if (!isValidAddress(account)) {
        throw new HardhatLedgerError(
          `The following ledger address from the config is invalid: ${account}`
        );
      }
      return account.toLowerCase();
    });
  }

  public get eth(): EthWrapper {
    if (this._eth === undefined) {
      throw new HardhatError(ERRORS.GENERAL.UNINITIALIZED_PROVIDER);
    }
    return this._eth;
  }

  public async init(): Promise<void> {
    // If init is called concurrently, it can cause the Ledger to throw
    // because the transport might be in use. This is a known problem but shouldn't happen
    // as init is not called manually. More info read: https://github.com/NomicFoundation/hardhat/pull/4008#discussion_r1233258204

    if (this._eth === undefined) {
      const openTimeout =
        this.options.openTimeout ?? LedgerProvider.DEFAULT_TIMEOUT;

      const connectionTimeout =
        this.options.connectionTimeout ?? LedgerProvider.DEFAULT_TIMEOUT;

      try {
        this.emit("connection_start");

        const transport = await TransportNodeHid.create(
          openTimeout,
          connectionTimeout
        );
        this._eth = wrapTransport(transport);

        this.emit("connection_success");
      } catch (error) {
        this.emit("connection_failure");

        if (error instanceof Error) {
          throw new HardhatLedgerConnectionError(error);
        }

        throw error;
      }
    }

    try {
      const paths = await cache.read<Paths>();
      if (paths !== undefined) {
        Object.assign(this.paths, paths);
      }
    } catch (error) {}
  }

  public async request(args: RequestArguments): Promise<unknown> {
    const params = this._getParams(args);

    if (args.method === "hardhat_setLedgerOutputEnabled") {
      return this._setOutputEnabled(params);
    }

    if (args.method === "eth_accounts") {
      // some rpcs return "the method has been deprecated: eth_accounts" error
      let accounts: string[];
      try {
        accounts = (await this._wrappedProvider.request(args)) as string[];
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("deprecated: eth_accounts")
        ) {
          accounts = [];
        } else {
          throw error;
        }
      }
      return [...accounts, ...this.options.accounts];
    }

    if (this._methodRequiresSignature(args.method)) {
      try {
        if (args.method === "eth_sign") {
          return await this._ethSign(params);
        }

        if (args.method === "personal_sign") {
          return await this._personalSign(params);
        }

        if (args.method === "eth_signTypedData_v4") {
          return await this._ethSignTypedDataV4(params);
        }

        if (args.method === "eth_sendTransaction" && params.length > 0) {
          return await this._ethSendTransaction(params);
        }
      } catch (error) {
        // We skip non controlled errors and forward them to the wrapped provider
        if (!HardhatLedgerNotControlledAddressError.instanceOf(error)) {
          throw error;
        }
      }
    }

    return this._wrappedProvider.request(args);
  }

  private _methodRequiresSignature(method: string): boolean {
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

      await this._requireControlledInit(address);

      if (address !== undefined) {
        if (data === undefined) {
          throw new HardhatError(ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM);
        }

        const path = await this._derivePath(address);
        const signature = await this._withConfirmation(() =>
          this.eth.signPersonalMessage(path, data.toString("hex"))
        );
        return this._toRpcSig(signature);
      }
    }
  }

  private async _personalSign(params: any[]): Promise<unknown> {
    if (params.length > 0) {
      const [data, address] = validateParams(params, rpcData, rpcAddress);

      await this._requireControlledInit(address);

      if (data !== undefined) {
        if (address === undefined) {
          throw new HardhatError(
            ERRORS.NETWORK.PERSONALSIGN_MISSING_ADDRESS_PARAM
          );
        }

        const path = await this._derivePath(address);
        const signature = await this._withConfirmation(() =>
          this.eth.signPersonalMessage(path, data.toString("hex"))
        );
        return this._toRpcSig(signature);
      }
    }
  }

  private async _ethSignTypedDataV4(params: any[]): Promise<unknown> {
    const [address, data] = validateParams(params, rpcAddress, t.any as any);

    await this._requireControlledInit(address);

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

    const { types, domain, message, primaryType } = typedMessage;
    const { EIP712Domain: _, ...structTypes } = types;

    const path = await this._derivePath(address);
    const signature = await this._withConfirmation(async () => {
      try {
        return await this.eth.signEIP712Message(path, typedMessage);
      } catch (error) {
        return this.eth.signEIP712HashedMessage(
          path,
          ethers.TypedDataEncoder.hashDomain(domain),
          ethers.TypedDataEncoder.hashStruct(primaryType, structTypes, message)
        );
      }
    });

    return this._toRpcSig(signature);
  }

  private async _ethSendTransaction(params: any[]): Promise<unknown> {
    const [txRequest] = validateParams(params, rpcTransactionRequest);

    await this._requireControlledInit(txRequest.from);

    if (txRequest.gas === undefined) {
      throw new HardhatError(ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY, {
        param: "gas",
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

    const path = await this._derivePath(txRequest.from);

    if (txRequest.nonce === undefined) {
      txRequest.nonce = await this._getNonce(txRequest.from);
    }

    const chainId = await this._getChainId();

    const baseTx: ethers.TransactionLike = {
      chainId,
      gasLimit: txRequest.gas,
      gasPrice: txRequest.gasPrice,
      maxFeePerGas: txRequest.maxFeePerGas,
      maxPriorityFeePerGas: txRequest.maxPriorityFeePerGas,
      nonce: Number(txRequest.nonce),
      value: txRequest.value,
    };
    if (txRequest.to !== undefined) {
      baseTx.to = toHex(txRequest.to);
    }
    if (txRequest.data !== undefined) {
      baseTx.data = toHex(txRequest.data);
    }
    // force legacy tx type if EIP-1559 fields are not present
    if (!hasEip1559Fields) {
      baseTx.type = 0;
    }

    const txToSign =
      ethers.Transaction.from(baseTx).unsignedSerialized.substring(2);

    const resolution = await ledgerService.resolveTransaction(txToSign, {}, {});

    const signature = await this._withConfirmation(() =>
      this.eth.signTransaction(path, txToSign, resolution)
    );

    const rawTransaction = ethers.Transaction.from({
      ...baseTx,
      signature: {
        v: toHex(signature.v),
        r: toHex(signature.r),
        s: toHex(signature.s),
      },
    }).serialized;

    return this._wrappedProvider.request({
      method: "eth_sendRawTransaction",
      params: [rawTransaction],
    });
  }

  private async _derivePath(addressToFindAsBuffer: Buffer): Promise<string> {
    const addressToFind = toHex(addressToFindAsBuffer).toLowerCase();

    if (this.paths[addressToFind] !== undefined) {
      return this.paths[addressToFind];
    }

    this.emit("derivation_start");

    let path = "<unset-path>";
    try {
      for (
        let account = 0;
        account <= LedgerProvider.MAX_DERIVATION_ACCOUNTS;
        account++
      ) {
        path = this._getDerivationPath(account);

        this.emit("derivation_progress", path, account);

        const wallet = await this.eth.getAddress(path);
        const address = wallet.address.toLowerCase();

        if (address === addressToFind) {
          this.emit("derivation_success", path);
          this.paths[addressToFind] = path;

          void cache.write(this.paths); // hanging promise

          return path;
        }
      }
    } catch (error) {
      const message = (error as Error).message;

      this.emit("derivation_failure");
      throw new HardhatLedgerDerivationPathError(
        `There was an error trying to derivate path ${path}: "${message}". The wallet might be connected but locked or in the wrong app.`,
        path
      );
    }

    this.emit("derivation_failure");
    throw new HardhatLedgerDerivationPathError(
      `Could not find a valid derivation path for ${addressToFind}. Paths from ${this._getDerivationPath(
        0
      )} to ${this._getDerivationPath(
        LedgerProvider.MAX_DERIVATION_ACCOUNTS
      )} were searched.`,
      path
    );
  }

  private _getDerivationPath(index: number): string {
    if (this.options.derivationFunction === undefined) {
      return `m/44'/60'/${index}'/0/0`;
    } else {
      return this.options.derivationFunction(index);
    }
  }

  private async _withConfirmation<T extends (...args: any) => any>(
    func: T
  ): Promise<ReturnType<T>> {
    try {
      this.emit("confirmation_start");
      const result = await func();
      this.emit("confirmation_success");

      return result;
    } catch (error) {
      this.emit("confirmation_failure");
      throw new HardhatLedgerError((error as Error).message);
    }
  }

  private async _toRpcSig(signature: Signature): Promise<string> {
    const { toRpcSig, toBytes } = await import("@ethereumjs/util");

    return toRpcSig(
      BigInt(signature.v - 27),
      toBytes(toHex(signature.r)),
      toBytes(toHex(signature.s))
    );
  }

  private async _getNonce(address: Buffer): Promise<bigint> {
    const { bytesToHex } = await import("@ethereumjs/util");

    const response = (await this._wrappedProvider.request({
      method: "eth_getTransactionCount",
      params: [bytesToHex(address), "pending"],
    })) as string;

    return rpcQuantityToBigInt(response);
  }

  private async _requireControlledInit(address: Buffer): Promise<void> {
    this._requireControlledAddress(address);
    await this.init();
  }

  private _requireControlledAddress(address: Buffer): void {
    const hexAddress = toHex(address).toLowerCase();
    const isControlledAddress = this.options.accounts.includes(hexAddress);

    if (!isControlledAddress) {
      throw new HardhatLedgerNotControlledAddressError(
        "Tried to send a transaction with an address we don't control.",
        hexAddress
      );
    }
  }

  /**
   * Toggles the provider's output. Use to suppress default feedback and
   * manage it via events.
   */
  private _setOutputEnabled(params: any[]): void {
    const [enabled] = validateParams(params, t.boolean);

    this.isOutputEnabled = enabled;
  }
}

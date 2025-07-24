import type { Paths, Signature, LedgerOptions } from "./type.js";
import type { TransportError } from "@ledgerhq/errors";
import type { EIP712Message } from "@ledgerhq/types-live";
import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
} from "hardhat/types/providers";

import { isEIP712Message } from "@ledgerhq/evm-tools/lib/index";
import Eth, { ledgerService } from "@ledgerhq/hw-app-eth";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { isAddress } from "@nomicfoundation/hardhat-utils/eth";
import {
  bytesToHexString,
  hexStringToBigInt,
  hexStringToNumber,
  normalizeHexString,
} from "@nomicfoundation/hardhat-utils/hex";
import {
  getRequestParams,
  rpcAddress,
  rpcAny,
  rpcData,
  rpcTransactionRequest,
  validateParams,
} from "hardhat/utils/rpc";
import { Transaction } from "micro-eth-signer";
import * as typed from "micro-eth-signer/typed-data";
import { add0x, initSig } from "micro-eth-signer/utils";

import * as cache from "./cache.js";
import { createTx } from "./create-tx.js";
import { getYParity } from "./get-y-parity.js";
import { PLUGIN_NAME } from "./plugin-name.js";

export class LedgerHandler {
  public static readonly MAX_DERIVATION_ACCOUNTS = 20;
  public static readonly DEFAULT_TIMEOUT = 3000;

  readonly #provider: EthereumProvider;
  readonly #displayMessage: (message: string) => Promise<void>;
  readonly #ethConstructor: typeof Eth.default;
  readonly #transportNodeHid: typeof TransportNodeHid.default;
  readonly #cachePath: string | undefined;

  #eth: Eth.default | undefined;
  #chainId: bigint | undefined;

  public readonly options: LedgerOptions;
  public isOutputEnabled: boolean = true;
  public paths: Paths = {};

  constructor(
    provider: EthereumProvider,
    options: LedgerOptions,
    displayMessage: (interruptor: string, message: string) => Promise<void>,
    customConfig?: {
      // Allows passing a custom config, primarily used for testing
      ethConstructor?: typeof Eth.default;
      transportNodeHid?: typeof TransportNodeHid.default;
      cachePath?: string;
    },
  ) {
    this.#ethConstructor = customConfig?.ethConstructor ?? Eth.default;
    this.#transportNodeHid =
      customConfig?.transportNodeHid ?? TransportNodeHid.default;
    this.#cachePath = customConfig?.cachePath;

    this.#provider = provider;
    this.#displayMessage = async (message: string): Promise<void> => {
      await displayMessage(PLUGIN_NAME, message);
    };

    this.options = options;

    this.options.accounts = options.accounts.map((address) => {
      if (!isAddress(address)) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.INVALID_LEDGER_ADDRESS,
          {
            address,
          },
        );
      }

      return address.toLowerCase();
    });
  }

  public async handle(
    jsonRpcRequest: JsonRpcRequest,
    otherAccounts: string[],
  ): Promise<JsonRpcRequest | JsonRpcResponse> {
    const params = getRequestParams(jsonRpcRequest);

    if (jsonRpcRequest.method === "eth_accounts") {
      return {
        jsonrpc: "2.0",
        id: jsonRpcRequest.id,
        result: [...otherAccounts, ...this.options.accounts],
      };
    }

    if (this.#methodRequiresSignature(jsonRpcRequest.method)) {
      let result;

      try {
        if (jsonRpcRequest.method === "eth_sign") {
          result = await this.#ethSign(params);
        }

        if (jsonRpcRequest.method === "personal_sign") {
          result = await this.#personalSign(params);
        }

        if (jsonRpcRequest.method === "eth_signTypedData_v4") {
          result = await this.#ethSignTypedDataV4(params);
        }

        if (
          jsonRpcRequest.method === "eth_sendTransaction" &&
          params.length > 0
        ) {
          const { method, params: paramsToReplace } =
            await this.#ethSendTransaction(params);

          // Return a modified request
          return {
            ...jsonRpcRequest,
            method,
            params: paramsToReplace,
          };
        }

        // Return a response
        return {
          jsonrpc: "2.0",
          id: jsonRpcRequest.id,
          result,
        };
      } catch (error) {
        // If the address is not controlled by the user, no error is thrown, and
        // the original request is returned. All other errors are propagated.
        if (
          (HardhatError.isHardhatError(error) &&
            error.number ===
              HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.UNOWNED_LEDGER_ADDRESS
                .number) === false
        ) {
          throw error;
        }
      }
    }

    // No interception required, return the original request as is
    return jsonRpcRequest;
  }

  #methodRequiresSignature(method: string): boolean {
    return [
      "eth_sendTransaction",
      "eth_sign",
      "eth_signTypedData_v4",
      "personal_sign",
    ].includes(method);
  }

  async #ethSign(params: unknown[]): Promise<unknown> {
    if (params.length > 0) {
      const [address, data] = validateParams(params, rpcAddress, rpcData);

      await this.#requireControlledInit(address);

      if (address !== undefined) {
        if (data === undefined) {
          throw new HardhatError(
            HardhatError.ERRORS.CORE.NETWORK.ETHSIGN_MISSING_DATA_PARAM,
          );
        }

        const path = await this.#derivePath(address);

        const signature = await this.#withConfirmation(() => {
          assertHardhatInvariant(
            this.#eth !== undefined,
            "Ledger handler should have initialized the eth instance",
          );

          return this.#eth.signPersonalMessage(
            path,
            bytesToHexString(data).replace("0x", ""),
          );
        });

        return this.#toRpcSig(signature);
      }
    }
  }

  async #requireControlledInit(
    address: Uint8Array<ArrayBufferLike>,
  ): Promise<void> {
    this.#requireControlledAddress(address);

    await this.init();
  }

  #requireControlledAddress(address: Uint8Array<ArrayBufferLike>): void {
    const hexAddress = bytesToHexString(address).toLowerCase();

    const isControlledAddress = this.options.accounts.includes(hexAddress);

    if (!isControlledAddress) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.UNOWNED_LEDGER_ADDRESS,
        {
          address: hexAddress,
        },
      );
    }
  }

  public async init(): Promise<void> {
    // If init is called concurrently, it can cause the Ledger to throw
    // because the transport might be in use. This is a known problem but shouldn't happen
    // as init is not called manually. More info read: https://github.com/NomicFoundation/hardhat/pull/4008#discussion_r1233258204

    if (this.#eth === undefined) {
      try {
        await this.#displayMessage("Connecting to Ledger...");

        const transport = await this.#transportNodeHid.create(
          LedgerHandler.DEFAULT_TIMEOUT,
          LedgerHandler.DEFAULT_TIMEOUT,
        );

        this.#eth = new this.#ethConstructor(transport);

        await this.#displayMessage("Connection successful");
      } catch (error) {
        await this.#displayMessage("Connection error");

        ensureError(error);

        let transportId = "";

        if (error.name === "TransportError") {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- if error is of type TransportError, it has an id property
          transportId = (error as TransportError).id;
        }

        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
          { error, transportId },
        );
      }
    }

    try {
      const paths = await cache.read(this.#cachePath);

      if (paths !== undefined) {
        this.paths = { ...paths };
      }
    } catch (_error) {}
  }

  async #derivePath(
    addressToFindAsBuffer: Uint8Array<ArrayBufferLike>,
  ): Promise<string> {
    const addressToFind = bytesToHexString(addressToFindAsBuffer).toLowerCase();

    if (this.paths[addressToFind] !== undefined) {
      return this.paths[addressToFind];
    }

    await this.#displayMessage("Derivation started");

    let path = "<unset-path>";
    try {
      for (
        let accountI = 0;
        accountI <= LedgerHandler.MAX_DERIVATION_ACCOUNTS;
        accountI++
      ) {
        path = this.#getDerivationPath(accountI);

        await this.#displayMessage(
          `Derivation progress. Path: ${path}, account index: ${accountI}`,
        );

        assertHardhatInvariant(
          this.#eth !== undefined,
          "Ledger handler should have initialized the eth instance",
        );

        const wallet = await this.#eth.getAddress(path);
        const address = wallet.address.toLowerCase();

        if (address === addressToFind) {
          await this.#displayMessage("Derivation success");

          this.paths[addressToFind] = path;

          await cache.write(this.paths, this.#cachePath);

          return path;
        }
      }
    } catch (error) {
      ensureError(error);

      await this.#displayMessage("Derivation failure");

      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.ERROR_WHILE_DERIVING_PATH,
        {
          path,
          message: error.message,
        },
      );
    }

    await this.#displayMessage("Derivation failure");

    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CANNOT_FIND_VALID_DERIVATION_PATH,
      {
        address: addressToFind,
        pathStart: this.#getDerivationPath(0),
        pathEnd: this.#getDerivationPath(LedgerHandler.MAX_DERIVATION_ACCOUNTS),
      },
    );
  }

  #getDerivationPath(index: number): string {
    if (this.options.derivationFunction === undefined) {
      return `m/44'/60'/${index}'/0/0`;
    } else {
      return this.options.derivationFunction(index);
    }
  }

  async #withConfirmation<T extends (...args: any) => any>(
    func: T,
  ): Promise<ReturnType<T>> {
    try {
      await this.#displayMessage("Confirmation start");

      const result = await func();

      await this.#displayMessage("Confirmation success");

      return result;
    } catch (error) {
      await this.#displayMessage("Confirmation failure");

      ensureError(error);

      if (error.name === "LockedDeviceError") {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.LOCKED_DEVICE,
        );
      }

      throw error;
    }
  }

  async #toRpcSig(sig: Signature): Promise<string> {
    const recovery = this.#calculateSigRecovery(sig.v - 27);

    assertHardhatInvariant(
      recovery === 0 || recovery === 1,
      `Invalid recovery value: ${recovery}. It should be either 0 or 1.`,
    );

    const nobleSig = initSig(
      { r: toBigInt(`0x${sig.r}`), s: toBigInt(`0x${sig.s}`) },
      recovery,
    );

    const hex64 = nobleSig.toCompactHex();
    const vByte = recovery === 0 ? "1b" : "1c";

    return add0x(hex64 + vByte);
  }

  #calculateSigRecovery(v: number): number {
    if (v === 0 || v === 1) {
      return v;
    }

    return v - 27;
  }

  async #personalSign(params: any[]): Promise<unknown> {
    if (params.length > 0) {
      const [data, address] = validateParams(params, rpcData, rpcAddress);

      await this.#requireControlledInit(address);

      if (data !== undefined) {
        if (address === undefined) {
          throw new HardhatError(
            HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.PERSONAL_SIGN_MISSING_ADDRESS_PARAM,
          );
        }

        const path = await this.#derivePath(address);

        const signature = await this.#withConfirmation(() => {
          assertHardhatInvariant(
            this.#eth !== undefined,
            "Ledger handler should have initialized the eth instance",
          );

          return this.#eth.signPersonalMessage(
            path,
            bytesToHexString(data).replace("0x", ""),
          );
        });

        return this.#toRpcSig(signature);
      }
    }
  }

  async #ethSignTypedDataV4(params: any[]): Promise<unknown> {
    const [address, data] = validateParams(params, rpcAddress, rpcAny);

    await this.#requireControlledInit(address);

    if (data === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.ETH_SIGN_MISSING_DATA_PARAM,
      );
    }

    let typedMessage: EIP712Message;
    try {
      typedMessage = typeof data === "string" ? JSON.parse(data) : data;

      if (!isEIP712Message(typedMessage)) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM,
        );
      }
    } catch {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM,
      );
    }

    const { types, domain, message, primaryType } = typedMessage;

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- A type assertion is necessary because there is no type overlap between the `domain` imported from `@ledgerhq`
    and the parameter type expected by the function imported from `micro-eth-signer`. */
    const enc = typed.encoder(types, domain as any);

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- A type assertion is necessary because there is no type overlap between the `domain` imported from `@ledgerhq`
    and the parameter type expected by the function imported from `micro-eth-signer`. */
    const domainHash = enc.structHash("EIP712Domain", domain as any);

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- A type assertion is necessary because there is no type overlap between the `message` imported from `@ledgerhq`
    and the parameter type expected by the function imported from `micro-eth-signer`. */
    const structHash = enc.structHash(primaryType, message as any);

    const path = await this.#derivePath(address);
    const signature = await this.#withConfirmation(async () => {
      assertHardhatInvariant(
        this.#eth !== undefined,
        "Ledger handler should have initialized the eth instance",
      );

      try {
        return await this.#eth.signEIP712Message(path, typedMessage);
      } catch (_error) {
        return this.#eth.signEIP712HashedMessage(
          path,
          domainHash,

          structHash,
        );
      }
    });

    return this.#toRpcSig(signature);
  }

  async #ethSendTransaction(params: any[]): Promise<{
    method: string;
    params: string[];
  }> {
    const [txRequest] = validateParams(params, rpcTransactionRequest);

    await this.#requireControlledInit(txRequest.from);

    if (txRequest.gas === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
        {
          param: "gas",
        },
      );
    }

    const hasGasPrice = txRequest.gasPrice !== undefined;
    const hasEip1559Fields =
      txRequest.maxFeePerGas !== undefined ||
      txRequest.maxPriorityFeePerGas !== undefined;

    if (!hasGasPrice && !hasEip1559Fields) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.MISSING_FEE_PRICE_FIELDS,
      );
    }

    if (hasGasPrice && hasEip1559Fields) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.INCOMPATIBLE_FEE_PRICE_FIELDS,
      );
    }

    if (hasEip1559Fields && txRequest.maxFeePerGas === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
        {
          param: "maxFeePerGas",
        },
      );
    }

    if (hasEip1559Fields && txRequest.maxPriorityFeePerGas === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
        {
          param: "maxPriorityFeePerGas",
        },
      );
    }

    const path = await this.#derivePath(txRequest.from);

    if (txRequest.nonce === undefined) {
      txRequest.nonce = await this.#getNonce(txRequest.from);
    }

    if (this.#chainId === undefined) {
      this.#chainId = hexStringToBigInt(
        await this.#provider.request({
          method: "eth_chainId",
        }),
      );
    }

    assertHardhatInvariant(
      this.#chainId !== undefined,
      "chainId should be defined",
    );

    const unsignedTx = createTx(txRequest, this.#chainId);

    const txToSign = unsignedTx.toHex(false).substring(2);

    const resolution = await ledgerService.resolveTransaction(txToSign, {}, {});

    const signature = await this.#withConfirmation(() => {
      assertHardhatInvariant(
        this.#eth !== undefined,
        "Ledger handler should have initialized the eth instance",
      );

      return this.#eth.signTransaction(path, txToSign, resolution);
    });

    const signedTx = new Transaction(unsignedTx.type, {
      ...unsignedTx.raw,
      r: toBigInt(normalizeHexString(signature.r)),
      s: toBigInt(normalizeHexString(signature.s)),
      yParity: getYParity(hexStringToNumber(normalizeHexString(signature.v))),
    }).toHex();

    return {
      method: "eth_sendRawTransaction",
      params: [signedTx],
    };
  }

  async #getNonce(address: Uint8Array<ArrayBufferLike>): Promise<bigint> {
    const nonce = await this.#provider.request({
      method: "eth_getTransactionCount",
      params: [bytesToHexString(address), "pending"],
    });

    return hexStringToBigInt(nonce);
  }
}

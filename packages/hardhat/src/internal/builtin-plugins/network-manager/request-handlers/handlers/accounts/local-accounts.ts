import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../../../types/providers.js";
import type { RequestHandler } from "../../types.js";
import type { RpcTransactionRequest } from "@nomicfoundation/hardhat-zod-utils/rpc";
import type * as MicroEthSignerT from "micro-eth-signer";
import type * as MicroEthSignerTypedDataT from "micro-eth-signer/typed-data";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import {
  bytesToHexString,
  hexStringToBigInt,
  hexStringToBytes,
} from "@nomicfoundation/hardhat-utils/hex";
import {
  bytesToBigInt,
  bytesToNumber,
} from "@nomicfoundation/hardhat-utils/number";
import {
  rpcAddress,
  rpcAny,
  rpcData,
  rpcTransactionRequest,
  validateParams,
} from "@nomicfoundation/hardhat-zod-utils/rpc";

// micro-eth-signer is known to be slow to load, so we lazy load it
let microEthSigner: typeof MicroEthSignerT | undefined;
let microEthSignerTypedData: typeof MicroEthSignerTypedDataT | undefined;

import { getRequestParams } from "../../../json-rpc.js";
import { ChainId } from "../chain-id/chain-id.js";

const EXTRA_ENTROPY = false;
export class LocalAccountsHandler extends ChainId implements RequestHandler {
  readonly #methods: ReadonlySet<string> = new Set([
    "eth_accounts",
    "eth_requestAccounts",
    "eth_sign",
    "personal_sign",
    "eth_signTypedData_v4",
    "eth_sendTransaction",
  ]);

  readonly #localAccountsHexPrivateKeys: string[];

  #addressToPrivateKey: Map<string, Uint8Array> | undefined;
  #addresses: string[] | undefined;

  constructor(
    provider: EthereumProvider,
    localAccountsHexPrivateKeys: string[],
  ) {
    super(provider);

    this.#localAccountsHexPrivateKeys = localAccountsHexPrivateKeys;
  }

  public isSupportedMethod(jsonRpcRequest: JsonRpcRequest): boolean {
    return this.#methods.has(jsonRpcRequest.method);
  }

  public async handle(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest | JsonRpcResponse> {
    if (!this.isSupportedMethod(jsonRpcRequest)) {
      return jsonRpcRequest;
    }

    const response = await this.#resolveRequest(jsonRpcRequest);
    if (response !== null) {
      return response;
    }

    await this.#modifyRequest(jsonRpcRequest);

    return jsonRpcRequest;
  }

  async #getAddressesAndPrivateKeysMap(): Promise<{
    addresses: string[];
    addressToPrivateKey: Map<string, Uint8Array>;
  }> {
    if (
      this.#addresses === undefined ||
      this.#addressToPrivateKey === undefined
    ) {
      const { addresses, addressToPrivateKey } =
        await this.#initializeAddressesFromPrivateKeys(
          this.#localAccountsHexPrivateKeys,
        );
      this.#addresses = addresses;
      this.#addressToPrivateKey = addressToPrivateKey;
    }

    return {
      addresses: this.#addresses,
      addressToPrivateKey: this.#addressToPrivateKey,
    };
  }

  async #resolveRequest(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcResponse | null> {
    if (
      jsonRpcRequest.method === "eth_accounts" ||
      jsonRpcRequest.method === "eth_requestAccounts"
    ) {
      const { addresses } = await this.#getAddressesAndPrivateKeysMap();
      return this.#createJsonRpcResponse(jsonRpcRequest.id, [...addresses]);
    }

    const params = getRequestParams(jsonRpcRequest);

    if (jsonRpcRequest.method === "eth_sign") {
      if (params.length > 0) {
        const [address, data] = validateParams(params, rpcAddress, rpcData);

        if (address !== undefined) {
          if (data === undefined) {
            throw new HardhatError(
              HardhatError.ERRORS.CORE.NETWORK.ETHSIGN_MISSING_DATA_PARAM,
            );
          }

          if (microEthSignerTypedData === undefined) {
            microEthSignerTypedData = await import(
              "micro-eth-signer/typed-data"
            );
          }

          const privateKey = await this.#getPrivateKeyForAddress(address);
          return this.#createJsonRpcResponse(
            jsonRpcRequest.id,
            microEthSignerTypedData.personal.sign(
              data,
              privateKey,
              EXTRA_ENTROPY,
            ),
          );
        }
      }
    }

    if (jsonRpcRequest.method === "personal_sign") {
      if (params.length > 0) {
        const [data, address] = validateParams(params, rpcData, rpcAddress);

        if (data !== undefined) {
          if (address === undefined) {
            throw new HardhatError(
              HardhatError.ERRORS.CORE.NETWORK.PERSONALSIGN_MISSING_ADDRESS_PARAM,
            );
          }

          if (microEthSignerTypedData === undefined) {
            microEthSignerTypedData = await import(
              "micro-eth-signer/typed-data"
            );
          }

          const privateKey = await this.#getPrivateKeyForAddress(address);
          return this.#createJsonRpcResponse(
            jsonRpcRequest.id,
            microEthSignerTypedData.personal.sign(
              data,
              privateKey,
              EXTRA_ENTROPY,
            ),
          );
        }
      }
    }

    if (jsonRpcRequest.method === "eth_signTypedData_v4") {
      const [address, data] = validateParams(params, rpcAddress, rpcAny);

      if (data === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.NETWORK.ETHSIGN_MISSING_DATA_PARAM,
        );
      }

      let typedMessage = data;
      if (typeof data === "string") {
        try {
          typedMessage = JSON.parse(data);
        } catch {
          throw new HardhatError(
            HardhatError.ERRORS.CORE.NETWORK.ETHSIGN_TYPED_DATA_V4_INVALID_DATA_PARAM,
          );
        }
      }

      // if we don't manage the address, the method is forwarded
      const privateKey = await this.#getPrivateKeyForAddressOrNull(address);
      if (privateKey !== null) {
        if (microEthSignerTypedData === undefined) {
          microEthSignerTypedData = await import("micro-eth-signer/typed-data");
        }

        return this.#createJsonRpcResponse(
          jsonRpcRequest.id,
          microEthSignerTypedData.signTyped(
            typedMessage,
            privateKey,
            EXTRA_ENTROPY,
          ),
        );
      }
    }

    return null;
  }

  async #modifyRequest(jsonRpcRequest: JsonRpcRequest): Promise<void> {
    const params = getRequestParams(jsonRpcRequest);

    if (jsonRpcRequest.method === "eth_sendTransaction" && params.length > 0) {
      const [txRequest] = validateParams(params, rpcTransactionRequest);

      if (txRequest.gas === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "gas" },
        );
      }

      if (txRequest.from === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "from" },
        );
      }

      const hasGasPrice = txRequest.gasPrice !== undefined;
      const hasEip1559Fields =
        txRequest.maxFeePerGas !== undefined ||
        txRequest.maxPriorityFeePerGas !== undefined;
      const hasEip7702Fields = txRequest.authorizationList !== undefined;

      if (!hasGasPrice && !hasEip1559Fields) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.NETWORK.MISSING_FEE_PRICE_FIELDS,
        );
      }

      if (hasGasPrice && hasEip7702Fields) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.NETWORK.INCOMPATIBLE_EIP7702_FIELDS,
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
          { param: "maxFeePerGas" },
        );
      }

      if (hasEip1559Fields && txRequest.maxPriorityFeePerGas === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "maxPriorityFeePerGas" },
        );
      }

      if (txRequest.nonce === undefined) {
        txRequest.nonce = await this.#getNonce(txRequest.from);
      }

      const privateKey = await this.#getPrivateKeyForAddress(txRequest.from);

      const chainId = await this.getChainId();

      const rawTransaction = await this.#getSignedTransaction(
        txRequest,
        chainId,
        privateKey,
      );

      jsonRpcRequest.method = "eth_sendRawTransaction";
      jsonRpcRequest.params = [bytesToHexString(rawTransaction)];
    }
  }

  async #initializeAddressesFromPrivateKeys(
    localAccountsHexPrivateKeys: string[],
  ) {
    if (microEthSigner === undefined) {
      microEthSigner = await import("micro-eth-signer");
    }

    const privateKeys: Uint8Array[] = localAccountsHexPrivateKeys.map((h) =>
      hexStringToBytes(h),
    );

    const addresses = [];
    const addressToPrivateKey = new Map<string, Uint8Array>();
    for (const pk of privateKeys) {
      const address = microEthSigner.addr.fromPrivateKey(pk).toLowerCase();
      addressToPrivateKey.set(address, pk);
      addresses.push(address);
    }

    return { addresses, addressToPrivateKey };
  }

  async #getPrivateKeyForAddress(address: Uint8Array): Promise<Uint8Array> {
    const { addressToPrivateKey } = await this.#getAddressesAndPrivateKeysMap();

    const pk = addressToPrivateKey.get(bytesToHexString(address));

    if (pk === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.NOT_LOCAL_ACCOUNT,
        {
          account: bytesToHexString(address),
        },
      );
    }

    return pk;
  }

  async #getPrivateKeyForAddressOrNull(
    address: Uint8Array,
  ): Promise<Uint8Array | null> {
    try {
      return await this.#getPrivateKeyForAddress(address);
    } catch {
      return null;
    }
  }

  async #getNonce(address: Uint8Array): Promise<bigint> {
    const response = await this.provider.request({
      method: "eth_getTransactionCount",
      params: [bytesToHexString(address), "pending"],
    });

    assertHardhatInvariant(
      typeof response === "string",
      "response should be a string",
    );

    return hexStringToBigInt(response);
  }

  async #getSignedTransaction(
    transactionRequest: RpcTransactionRequest,
    chainId: number,
    privateKey: Uint8Array,
  ): Promise<Uint8Array> {
    if (microEthSigner === undefined) {
      microEthSigner = await import("micro-eth-signer");
    }

    const { addr, Transaction } = microEthSigner;

    const txData = {
      ...transactionRequest,
      gasLimit: transactionRequest.gas,
    };

    const accessList = txData.accessList?.map(({ address, storageKeys }) => {
      return {
        address: addr.addChecksum(bytesToHexString(address)),
        storageKeys:
          storageKeys !== null
            ? storageKeys.map((k) => bytesToHexString(k))
            : [],
      };
    });

    const authorizationList = txData.authorizationList?.map(
      ({ chainId: authChainId, address, nonce, yParity, r, s }) => {
        return {
          chainId: authChainId,
          address: addr.addChecksum(bytesToHexString(address)),
          nonce,
          yParity: bytesToNumber(yParity),
          r: bytesToBigInt(r),
          s: bytesToBigInt(s),
        };
      },
    );

    if (
      (txData.to === undefined || txData.to === null) &&
      txData.data === undefined
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.DATA_FIELD_CANNOT_BE_NULL_WITH_NULL_ADDRESS,
      );
    }

    const checksummedAddress = addr.addChecksum(
      bytesToHexString(txData.to ?? new Uint8Array()),
      true,
    );

    assertHardhatInvariant(
      txData.nonce !== undefined,
      "nonce should be defined",
    );

    let transaction;
    // strict mode is not meant to be used in the context of hardhat
    const strictMode = false;

    const baseTxParams = {
      to: checksummedAddress,
      nonce: txData.nonce,
      chainId: txData.chainId ?? toBigInt(chainId),
      value: txData.value ?? 0n,
      data: bytesToHexString(txData.data ?? new Uint8Array()),
      gasLimit: txData.gasLimit,
    };

    if (authorizationList !== undefined) {
      assertHardhatInvariant(
        txData.maxFeePerGas !== undefined,
        "maxFeePerGas should be defined",
      );

      transaction = Transaction.prepare(
        {
          type: "eip7702",
          ...baseTxParams,
          maxFeePerGas: txData.maxFeePerGas,
          maxPriorityFeePerGas: txData.maxPriorityFeePerGas,
          accessList: accessList ?? [],
          authorizationList: authorizationList ?? [],
        },
        strictMode,
      );
    } else if (txData.maxFeePerGas !== undefined) {
      transaction = Transaction.prepare(
        {
          type: "eip1559",
          ...baseTxParams,
          maxFeePerGas: txData.maxFeePerGas,
          maxPriorityFeePerGas: txData.maxPriorityFeePerGas,
          accessList: accessList ?? [],
        },
        strictMode,
      );
    } else if (accessList !== undefined) {
      transaction = Transaction.prepare(
        {
          type: "eip2930",
          ...baseTxParams,
          gasPrice: txData.gasPrice ?? 0n,
          accessList,
        },
        strictMode,
      );
    } else {
      transaction = Transaction.prepare(
        {
          type: "legacy",
          ...baseTxParams,
          gasPrice: txData.gasPrice ?? 0n,
        },
        strictMode,
      );
    }

    const signedTransaction = transaction.signBy(privateKey, EXTRA_ENTROPY);

    return signedTransaction.toRawBytes();
  }

  #createJsonRpcResponse(
    id: number | string,
    result: unknown,
  ): JsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id,
      result,
    };
  }
}

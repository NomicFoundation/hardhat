import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../../../types/providers.js";
import type { RequestHandler } from "../../types.js";

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
import { addr, Transaction } from "micro-eth-signer";
import * as typed from "micro-eth-signer/typed-data";
import { signTyped } from "micro-eth-signer/typed-data";

import { getRequestParams } from "../../../json-rpc.js";
import { rpcAddress } from "../../../rpc/types/address.js";
import { rpcAny } from "../../../rpc/types/any.js";
import { rpcData } from "../../../rpc/types/data.js";
import {
  rpcTransactionRequest,
  type RpcTransactionRequest,
} from "../../../rpc/types/tx-request.js";
import { validateParams } from "../../../rpc/validate-params.js";
import { ChainId } from "../chain-id/chain-id.js";

/**
 * This handler takes a long time to load. Currently, it is only used in the handlers array,
 * where it is imported dynamically, and in the HDWalletHandler, which itself is only loaded
 * dynamically.
 * If we ever need to import this handler elsewhere, we should either import it dynamically
 * or import some of the dependencies of this handler dynamically.
 * It has been identified that micro-eth-signer is one of the most expensive dependencies here.
 * See https://github.com/NomicFoundation/hardhat/pull/6481 for more details.
 */

const EXTRA_ENTROPY = false;
export class LocalAccountsHandler extends ChainId implements RequestHandler {
  readonly #addressToPrivateKey: Map<string, Uint8Array> = new Map();
  readonly #addresses: string[] = [];

  constructor(
    provider: EthereumProvider,
    localAccountsHexPrivateKeys: string[],
  ) {
    super(provider);

    this.#initializePrivateKeys(localAccountsHexPrivateKeys);
  }

  public async handle(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest | JsonRpcResponse> {
    const response = await this.#resolveRequest(jsonRpcRequest);
    if (response !== null) {
      return response;
    }

    await this.#modifyRequest(jsonRpcRequest);

    return jsonRpcRequest;
  }

  async #resolveRequest(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcResponse | null> {
    if (
      jsonRpcRequest.method === "eth_accounts" ||
      jsonRpcRequest.method === "eth_requestAccounts"
    ) {
      return this.#createJsonRpcResponse(jsonRpcRequest.id, [
        ...this.#addresses,
      ]);
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

          const privateKey = this.#getPrivateKeyForAddress(address);
          return this.#createJsonRpcResponse(
            jsonRpcRequest.id,
            typed.personal.sign(data, privateKey, EXTRA_ENTROPY),
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

          const privateKey = this.#getPrivateKeyForAddress(address);
          return this.#createJsonRpcResponse(
            jsonRpcRequest.id,
            typed.personal.sign(data, privateKey, EXTRA_ENTROPY),
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
      const privateKey = this.#getPrivateKeyForAddressOrNull(address);
      if (privateKey !== null) {
        return this.#createJsonRpcResponse(
          jsonRpcRequest.id,
          signTyped(typedMessage, privateKey, EXTRA_ENTROPY),
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

      const privateKey = this.#getPrivateKeyForAddress(txRequest.from);

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

  #initializePrivateKeys(localAccountsHexPrivateKeys: string[]) {
    const privateKeys: Uint8Array[] = localAccountsHexPrivateKeys.map((h) =>
      hexStringToBytes(h),
    );

    for (const pk of privateKeys) {
      const address = addr.fromPrivateKey(pk).toLowerCase();
      this.#addressToPrivateKey.set(address, pk);
      this.#addresses.push(address);
    }
  }

  #getPrivateKeyForAddress(address: Uint8Array): Uint8Array {
    const pk = this.#addressToPrivateKey.get(bytesToHexString(address));

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

  #getPrivateKeyForAddressOrNull(address: Uint8Array): Uint8Array | null {
    try {
      return this.#getPrivateKeyForAddress(address);
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

import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../../../types/providers.js";
import type { RequestHandler } from "../../types.js";
import type * as MicroEthSignerT from "micro-eth-signer";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  bytesToHexString,
  hexStringToBytes,
} from "@nomicfoundation/hardhat-utils/hex";
import {
  rpcAddress,
  rpcAny,
  rpcData,
  rpcTransactionRequest,
  validateParams,
} from "@nomicfoundation/hardhat-zod-utils/rpc";

// micro-eth-signer is known to be slow to load, so we lazy load it
let microEthSigner: typeof MicroEthSignerT | undefined;

import { getRequestParams } from "../../../json-rpc.js";
import { ChainId } from "../chain-id/chain-id.js";

import {
  assertTransactionCanBeSigned,
  getPendingNonce,
  prepareTransaction,
} from "./transaction-signing.js";

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

          if (microEthSigner === undefined) {
            microEthSigner = await import("micro-eth-signer");
          }

          const privateKey = await this.#getPrivateKeyForAddress(address);
          return this.#createJsonRpcResponse(
            jsonRpcRequest.id,
            microEthSigner.eip191Signer.sign(data, privateKey, EXTRA_ENTROPY),
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
              HardhatError.ERRORS.CORE.NETWORK
                .PERSONALSIGN_MISSING_ADDRESS_PARAM,
            );
          }

          if (microEthSigner === undefined) {
            microEthSigner = await import("micro-eth-signer");
          }

          const privateKey = await this.#getPrivateKeyForAddress(address);
          return this.#createJsonRpcResponse(
            jsonRpcRequest.id,
            microEthSigner.eip191Signer.sign(data, privateKey, EXTRA_ENTROPY),
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
            HardhatError.ERRORS.CORE.NETWORK
              .ETHSIGN_TYPED_DATA_V4_INVALID_DATA_PARAM,
          );
        }
      }

      // if we don't manage the address, the method is forwarded
      const privateKey = await this.#getPrivateKeyForAddressOrNull(address);
      if (privateKey !== null) {
        if (microEthSigner === undefined) {
          microEthSigner = await import("micro-eth-signer");
        }

        return this.#createJsonRpcResponse(
          jsonRpcRequest.id,
          microEthSigner.signTyped(typedMessage, privateKey, EXTRA_ENTROPY),
        );
      }
    }

    return null;
  }

  async #modifyRequest(jsonRpcRequest: JsonRpcRequest): Promise<void> {
    const params = getRequestParams(jsonRpcRequest);

    if (jsonRpcRequest.method === "eth_sendTransaction" && params.length > 0) {
      const [txRequest] = validateParams(params, rpcTransactionRequest);

      assertTransactionCanBeSigned(txRequest);

      if (txRequest.nonce === undefined) {
        txRequest.nonce = await getPendingNonce(this.provider, txRequest.from);
      }

      const privateKey = await this.#getPrivateKeyForAddress(txRequest.from);

      const chainId = await this.getChainId();

      const transaction = await prepareTransaction(txRequest, chainId);

      const rawTransaction = transaction
        .signBy(privateKey, EXTRA_ENTROPY)
        .toBytes();

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

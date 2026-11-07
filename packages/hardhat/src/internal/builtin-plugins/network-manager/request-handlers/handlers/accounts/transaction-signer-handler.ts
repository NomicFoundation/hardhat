import type {
  TransactionSigner,
  UnsignedTransaction,
} from "../../../../../../types/network.js";
import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../../../types/providers.js";
import type { RequestHandler } from "../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { keccak256 } from "@nomicfoundation/hardhat-utils/crypto";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { isAddress } from "@nomicfoundation/hardhat-utils/eth";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import {
  rpcTransactionRequest,
  validateParams,
} from "@nomicfoundation/hardhat-zod-utils/rpc";

import { getRequestParams } from "../../../json-rpc.js";
import { ChainId } from "../chain-id/chain-id.js";

import {
  assertTransactionCanBeSigned,
  getPendingNonce,
  prepareTransaction,
} from "./transaction-signing.js";

// The order of the secp256k1 curve.
const SECP256K1_N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

/**
 * Resolves the plugin-provided signer for a sender, if there is one.
 */
export type TransactionSignerResolver = (
  from: string,
) => Promise<TransactionSigner | undefined>;

/**
 * This handler signs `eth_sendTransaction` requests whose sender has a
 * plugin-provided `TransactionSigner`, and turns them into
 * `eth_sendRawTransaction` requests.
 *
 * It runs after the gas, fee and sender handlers, so the signer gets a filled
 * transaction. Requests whose sender has no signer pass through unchanged.
 */
export class TransactionSignerHandler
  extends ChainId
  implements RequestHandler
{
  readonly #resolveSigner: TransactionSignerResolver;

  constructor(
    provider: EthereumProvider,
    resolveSigner: TransactionSignerResolver,
  ) {
    super(provider);

    this.#resolveSigner = resolveSigner;
  }

  public isSupportedMethod(jsonRpcRequest: JsonRpcRequest): boolean {
    return jsonRpcRequest.method === "eth_sendTransaction";
  }

  public async handle(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest | JsonRpcResponse> {
    if (!this.isSupportedMethod(jsonRpcRequest)) {
      return jsonRpcRequest;
    }

    const params = getRequestParams(jsonRpcRequest);
    const [tx] = params;

    // Requests without a valid `from` go on unchanged, and fail or succeed
    // as they would without this handler.
    if (!isObject(tx) || !isAddress(tx.from)) {
      return jsonRpcRequest;
    }

    const signer = await this.#resolveSigner(tx.from.toLowerCase());

    if (signer === undefined) {
      return jsonRpcRequest;
    }

    const [txRequest] = validateParams(params, rpcTransactionRequest);

    assertTransactionCanBeSigned(txRequest);

    if (txRequest.nonce === undefined) {
      txRequest.nonce = await getPendingNonce(this.provider, txRequest.from);
    }

    const chainId = await this.getChainId();

    const transaction = await prepareTransaction(txRequest, chainId);

    const from = bytesToHexString(txRequest.from);
    const serialized = transaction.toBytes(false);

    const unsignedTransaction: UnsignedTransaction = {
      type: transaction.type,
      from,
      to:
        txRequest.to === undefined || txRequest.to === null
          ? undefined
          : bytesToHexString(txRequest.to),
      chainId: transaction.raw.chainId ?? BigInt(chainId),
      nonce: transaction.raw.nonce,
      gasLimit: transaction.raw.gasLimit,
      value: transaction.raw.value,
      data: transaction.raw.data,
      gasPrice:
        "gasPrice" in transaction.raw ? transaction.raw.gasPrice : undefined,
      maxFeePerGas:
        "maxFeePerGas" in transaction.raw
          ? transaction.raw.maxFeePerGas
          : undefined,
      maxPriorityFeePerGas:
        "maxPriorityFeePerGas" in transaction.raw
          ? transaction.raw.maxPriorityFeePerGas
          : undefined,
      serialized,
      hash: await keccak256(serialized),
    };

    const signature = await signer.signTransaction(unsignedTransaction);

    if (signature.yParity !== 0 && signature.yParity !== 1) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.INVALID_TRANSACTION_SIGNER_SIGNATURE,
        {
          account: from,
          reason: `yParity must be 0 or 1, but it is ${signature.yParity}`,
        },
      );
    }

    // Some signers, like cloud KMSs, return high-S signatures. Ethereum only
    // accepts low-S ones, so we use the equivalent low-S signature.
    const isHighS = signature.s > SECP256K1_N / 2n;
    const s = isHighS ? SECP256K1_N - signature.s : signature.s;
    const yParity = isHighS ? 1 - signature.yParity : signature.yParity;

    const { Transaction } = await import("micro-eth-signer");

    let sender: string | undefined;
    let signedTransaction: Uint8Array | undefined;
    let recoveryError: Error | undefined;
    try {
      // strict mode is not meant to be used in the context of hardhat
      const signed = new Transaction(
        transaction.type,
        { ...transaction.raw, r: signature.r, s, yParity },
        false,
      );

      sender = signed.recoverSender().address.toLowerCase();
      signedTransaction = signed.toBytes();
    } catch (error) {
      ensureError(error);
      recoveryError = error;
    }

    if (sender !== from || signedTransaction === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.INVALID_TRANSACTION_SIGNER_SIGNATURE,
        {
          account: from,
          reason:
            sender === undefined
              ? "no sender could be recovered from it"
              : `it recovers to ${sender}`,
        },
        recoveryError,
      );
    }

    jsonRpcRequest.method = "eth_sendRawTransaction";
    jsonRpcRequest.params = [bytesToHexString(signedTransaction)];

    return jsonRpcRequest;
  }
}

import type { EthereumProvider } from "../../../../../../types/providers.js";
import type { RpcTransactionRequest } from "@nomicfoundation/hardhat-zod-utils/rpc";
import type * as MicroEthSignerT from "micro-eth-signer";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  bytesToHexString,
  hexStringToBigInt,
} from "@nomicfoundation/hardhat-utils/hex";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import {
  bytesToBigInt,
  bytesToNumber,
} from "@nomicfoundation/hardhat-utils/number";

// micro-eth-signer is known to be slow to load, so we lazy load it
let microEthSigner: typeof MicroEthSignerT | undefined;

/**
 * A transaction request with the fields that signing it requires.
 */
export type SignableTransactionRequest = RpcTransactionRequest & {
  from: Uint8Array;
  gas: bigint;
};

/**
 * An unsigned transaction, built by `prepareTransaction`.
 */
export type PreparedTransaction = InstanceType<
  typeof MicroEthSignerT.Transaction<
    "legacy" | "eip2930" | "eip1559" | "eip7702"
  >
>;

/**
 * Checks that a transaction request has the fields that signing it requires:
 * `from`, `gas` and a consistent set of fee fields.
 */
export function assertTransactionCanBeSigned(
  txRequest: RpcTransactionRequest,
): asserts txRequest is SignableTransactionRequest {
  // We can't sign blob txs (type 3), and signing them as non-blob txs
  // would drop their blobs silently
  if (
    txRequest.type === 3n ||
    txRequest.blobs !== undefined ||
    txRequest.blobVersionedHashes !== undefined
  ) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.NETWORK.BLOB_TX_CANNOT_BE_SIGNED_LOCALLY,
    );
  }

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

  if (
    hasEip7702Fields &&
    (txRequest.to === undefined || txRequest.to === null)
  ) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.NETWORK.EIP7702_TX_CANNOT_CREATE_CONTRACT,
    );
  }

  if (txRequest.authorizationList?.length === 0) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.NETWORK.EMPTY_EIP7702_AUTHORIZATION_LIST,
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
}

/**
 * Returns the account's nonce, counting its pending transactions.
 */
export async function getPendingNonce(
  provider: EthereumProvider,
  address: Uint8Array,
): Promise<bigint> {
  const response = await provider.request({
    method: "eth_getTransactionCount",
    params: [bytesToHexString(address), "pending"],
  });

  assertHardhatInvariant(
    typeof response === "string",
    "response should be a string",
  );

  return hexStringToBigInt(response);
}

/**
 * Builds the unsigned transaction for a request that has passed
 * `assertTransactionCanBeSigned` and has a nonce.
 */
export async function prepareTransaction(
  transactionRequest: SignableTransactionRequest,
  chainId: number,
): Promise<PreparedTransaction> {
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
        storageKeys !== null ? storageKeys.map((k) => bytesToHexString(k)) : [],
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
      HardhatError.ERRORS.CORE.NETWORK
        .DATA_FIELD_CANNOT_BE_NULL_WITH_NULL_ADDRESS,
    );
  }

  const checksummedAddress = addr.addChecksum(
    bytesToHexString(txData.to ?? new Uint8Array()),
    true,
  );

  assertHardhatInvariant(txData.nonce !== undefined, "nonce should be defined");

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

  try {
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
  } catch (error) {
    ensureError(error);

    // micro-eth-signer reports invalid fields with a generic message and
    // keeps the reasons in an `errors` array, so we include them in ours
    if (isMicroEthSignerValidationError(error)) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.INVALID_TX_PARAMS_TO_SIGN_LOCALLY,
        {
          errors: error.errors
            .map(({ field, error: reason }) => `\t* ${field}: ${reason}`)
            .join("\n"),
        },
        error,
      );
    }

    throw error;
  }
  return transaction;
}

function isMicroEthSignerValidationError(
  error: Error,
): error is Error & { errors: Array<{ field: string; error: string }> } {
  return (
    "errors" in error &&
    Array.isArray(error.errors) &&
    error.errors.length > 0 &&
    error.errors.every(
      (fieldError: unknown) =>
        isObject(fieldError) &&
        typeof fieldError.field === "string" &&
        typeof fieldError.error === "string",
    )
  );
}

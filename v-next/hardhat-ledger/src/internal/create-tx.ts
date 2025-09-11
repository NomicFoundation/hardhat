import type { RpcTransactionRequest } from "hardhat/utils/rpc";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import {
  bytesToBigInt,
  bytesToHexString,
  bytesToNumber,
} from "@nomicfoundation/hardhat-utils/bytes";
import { addr, Transaction } from "micro-eth-signer";

const STRICT_MODE = false;

export function createTx(
  txRequest: RpcTransactionRequest,
  chainId: bigint,
): Transaction<"eip7702" | "eip1559" | "eip2930" | "legacy"> {
  const baseTxParams = {
    to:
      txRequest.to !== undefined && txRequest.to !== null
        ? bytesToHexString(txRequest.to)
        : "0x",
    nonce: txRequest.nonce !== undefined ? toBigInt(txRequest.nonce) : 0n,
    chainId,
    value: txRequest.value ?? 0n,
    data: bytesToHexString(txRequest.data ?? new Uint8Array()),
  };

  const accessList = txRequest.accessList?.map(({ address, storageKeys }) => {
    return {
      address: addr.addChecksum(bytesToHexString(address)),
      storageKeys:
        storageKeys !== null ? storageKeys.map((k) => bytesToHexString(k)) : [],
    };
  });

  const authorizationList = txRequest.authorizationList?.map(
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

  if (txRequest.authorizationList !== undefined) {
    assertHardhatInvariant(
      txRequest.maxFeePerGas !== undefined,
      "maxFeePerGas should be defined",
    );

    return Transaction.prepare(
      {
        type: "eip7702",
        ...baseTxParams,
        maxFeePerGas: txRequest.maxFeePerGas,
        ...(txRequest.maxPriorityFeePerGas !== undefined && {
          maxPriorityFeePerGas: txRequest.maxPriorityFeePerGas,
        }),
        accessList: accessList ?? [],
        authorizationList: authorizationList ?? [],
      },
      STRICT_MODE,
    );
  } else if (txRequest.maxFeePerGas !== undefined) {
    return Transaction.prepare(
      {
        type: "eip1559",
        ...baseTxParams,
        maxFeePerGas: txRequest.maxFeePerGas,
        ...(txRequest.maxPriorityFeePerGas !== undefined && {
          maxPriorityFeePerGas: txRequest.maxPriorityFeePerGas,
        }),
        accessList: accessList ?? [],
      },
      STRICT_MODE,
    );
  } else if (accessList !== undefined) {
    return Transaction.prepare(
      {
        type: "eip2930",
        ...baseTxParams,
        gasPrice: txRequest.gasPrice ?? 0n,
        accessList,
      },
      STRICT_MODE,
    );
  } else {
    return Transaction.prepare(
      {
        type: "legacy",
        ...baseTxParams,
        gasPrice: txRequest.gasPrice ?? 0n,
      },
      STRICT_MODE,
    );
  }
}

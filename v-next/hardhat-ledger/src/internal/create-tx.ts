import type { RpcTransactionRequest } from "@nomicfoundation/hardhat-zod-utils/rpc";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
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
  const checksummedAddress = addr.addChecksum(
    bytesToHexString(txRequest.to ?? new Uint8Array()),
    true,
  );

  assertHardhatInvariant(
    txRequest.nonce !== undefined,
    "nonce should be defined",
  );

  const baseTxParams = {
    to: checksummedAddress,
    nonce: toBigInt(txRequest.nonce),
    chainId,
    value: txRequest.value ?? 0n,
    data: bytesToHexString(txRequest.data ?? new Uint8Array()),
    gasLimit: txRequest.gasLimit,
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

  if (authorizationList !== undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.EIP_7702_TX_CURRENTLY_NOT_SUPPORTED,
    );

    // TODO: enable after migrating to the latest Ledger libraries that support EIP-7702
    // assertHardhatInvariant(
    //   txRequest.maxFeePerGas !== undefined,
    //   "maxFeePerGas should be defined",
    // );

    // return Transaction.prepare(
    //   {
    //     type: "eip7702",
    //     ...baseTxParams,
    //     maxFeePerGas: txRequest.maxFeePerGas,
    //     maxPriorityFeePerGas: txRequest.maxPriorityFeePerGas,
    //     accessList: accessList ?? [],
    //     authorizationList: authorizationList ?? [],
    //   },
    //   STRICT_MODE,
    // );
  } else if (txRequest.maxFeePerGas !== undefined) {
    return Transaction.prepare(
      {
        type: "eip1559",
        ...baseTxParams,
        maxFeePerGas: txRequest.maxFeePerGas,
        maxPriorityFeePerGas: txRequest.maxPriorityFeePerGas,
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

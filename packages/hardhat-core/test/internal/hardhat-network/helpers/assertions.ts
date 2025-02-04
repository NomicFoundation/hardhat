import { assert } from "chai";
import { bytesToHex as bufferToHex } from "@ethereumjs/util";

import {
  numberToRpcQuantity,
  rpcDataToBigInt,
  rpcQuantity,
  rpcQuantityToBigInt,
} from "../../../../src/internal/core/jsonrpc/types/base-types";
import { RpcTransactionRequestInput } from "../../../../src/internal/core/jsonrpc/types/input/transactionRequest";
import {
  InternalError,
  InvalidArgumentsError,
  InvalidInputError,
  MethodNotSupportedError,
  ProviderError,
} from "../../../../src/internal/core/providers/errors";
import {
  AccessListBufferItem,
  AccessListTransactionParams,
  EIP1559TransactionParams,
  LegacyTransactionParams,
  TransactionParams,
} from "../../../../src/internal/hardhat-network/provider/node-types";
import {
  AccessListEIP2930RpcTransactionOutput,
  EIP1559RpcTransactionOutput,
  LegacyRpcTransactionOutput,
  RpcAccessListOutput,
  RpcReceiptOutput,
  RpcTransactionOutput,
} from "../../../../src/internal/hardhat-network/provider/output";
import { SolidityError } from "../../../../src/internal/hardhat-network/stack-traces/solidity-errors";
import { EthereumProvider } from "../../../../src/types";

export async function assertProviderError(
  provider: EthereumProvider,
  method: string,
  params: any[] = [],
  message?: string,
  code?: number
) {
  let res: any;
  try {
    res = await provider.send(method, params);
  } catch (error) {
    if (!isProviderError(error)) {
      // This is not a provider error, so we rethrow it, as something broke
      throw error;
    }

    if (code !== undefined) {
      assert.equal(error.code, code);
    }

    if (message !== undefined) {
      assert.include(
        error.message.toLocaleLowerCase(),
        message.toLocaleLowerCase()
      );
    }

    return;
  }

  assert.fail(
    `Method '${method}' should have thrown '[${code}] ${message}' but returned '${res}'`
  );
}

export async function assertNotSupported(
  provider: EthereumProvider,
  method: string
) {
  return assertProviderError(
    provider,
    method,
    [],
    `Method ${method} is not supported`,
    MethodNotSupportedError.CODE
  );
}

export async function assertInternalError(
  provider: EthereumProvider,
  method: string,
  params: any[] = [],
  message?: string
) {
  return assertProviderError(
    provider,
    method,
    params,
    message,
    InternalError.CODE
  );
}

export async function assertInvalidArgumentsError(
  provider: EthereumProvider,
  method: string,
  params: any[] = [],
  message?: string
) {
  return assertProviderError(
    provider,
    method,
    params,
    message,
    InvalidArgumentsError.CODE
  );
}

export async function assertInvalidInputError(
  provider: EthereumProvider,
  method: string,
  params: any[] = [],
  message?: string
) {
  return assertProviderError(
    provider,
    method,
    params,
    message,
    InvalidInputError.CODE
  );
}

export function assertQuantity(
  actual: any,
  quantity: number | bigint,
  message?: string
) {
  assert.strictEqual(actual, numberToRpcQuantity(quantity), message);
}

export async function assertNodeBalances(
  provider: EthereumProvider,
  expectedBalances: Array<number | bigint>
) {
  const accounts: string[] = await provider.send("eth_accounts");

  const balances = await Promise.all(
    accounts.map((acc) => provider.send("eth_getBalance", [acc]))
  );

  assert.deepEqual(balances, expectedBalances.map(numberToRpcQuantity));
}

export async function assertPendingNodeBalances(
  provider: EthereumProvider,
  expectedBalances: Array<number | bigint>
) {
  const accounts: string[] = await provider.send("eth_accounts");

  const balances = await Promise.all(
    accounts.map((acc) => provider.send("eth_getBalance", [acc, "pending"]))
  );

  assert.deepEqual(balances, expectedBalances.map(numberToRpcQuantity));
}

function isProviderError(error: any): error is ProviderError {
  return typeof error.code === "number" && typeof error.message === "string";
}

export async function assertTransactionFailure(
  provider: EthereumProvider,
  txData: RpcTransactionRequestInput,
  message?: string,
  code?: number
) {
  try {
    await provider.send("eth_sendTransaction", [txData]);
  } catch (error) {
    if (!(error instanceof SolidityError) && !isProviderError(error)) {
      // Something broke here, so we rethrow
      throw error;
    }

    if (code !== undefined) {
      if (error instanceof SolidityError) {
        assert.fail(
          `Expected a ProviderError with code ${code} but got a SolidityError instead`
        );
      }

      assert.equal(error.code, code);
    }

    if (message !== undefined) {
      assert.include(
        error.message.toLowerCase(),
        message.toLowerCase(),
        `"${message}" not found in "${error.message}"`
      );
    }

    return;
  }

  assert.fail("Transaction should have failed");
}

export function assertReceiptMatchesGethOne(
  actual: any,
  gethReceipt: RpcReceiptOutput,
  expectedBlockNumber: number | bigint
) {
  assertQuantity(actual.blockNumber, expectedBlockNumber);
  assert.strictEqual(actual.transactionIndex, gethReceipt.transactionIndex);
  assert.strictEqual(actual.to, gethReceipt.to);
  assert.strictEqual(actual.logsBloom, gethReceipt.logsBloom);
  assert.deepEqual(actual.logs, gethReceipt.logs);
  assert.strictEqual(actual.status, gethReceipt.status);
  assert.deepEqual(actual.cumulativeGasUsed, gethReceipt.cumulativeGasUsed);
}

function assertTransaction(
  tx: RpcTransactionOutput,
  txHash: string,
  txParams: TransactionParams,
  blockNumber?: number,
  blockHash?: string,
  txIndex?: number
) {
  assert.equal(tx.from, bufferToHex(txParams.from));
  assertQuantity(tx.gas, txParams.gasLimit);
  assert.equal(tx.hash, txHash);
  assert.equal(tx.input, bufferToHex(txParams.data));
  assertQuantity(tx.nonce, txParams.nonce);
  assert.equal(
    tx.to,
    txParams.to === undefined ? null : bufferToHex(txParams.to)
  );
  assertQuantity(tx.value, txParams.value);

  if (blockHash !== undefined) {
    assert.equal(tx.blockHash, blockHash);
  } else {
    assert.isNull(tx.blockHash);
  }

  if (txIndex !== undefined) {
    assertQuantity(tx.transactionIndex, txIndex);
  } else {
    assert.isNull(tx.transactionIndex);
  }

  if (blockNumber !== undefined) {
    assertQuantity(tx.blockNumber, blockNumber);
  } else {
    assert.isNull(tx.blockNumber);
  }

  // We just want to validate that these are QUANTITY encoded
  assert.isTrue(rpcQuantity.decode(tx.r).isRight());
  assert.isTrue(rpcQuantity.decode(tx.s).isRight());
  assert.isTrue(rpcQuantity.decode(tx.v).isRight());
}

export function assertLegacyTransaction(
  tx: LegacyRpcTransactionOutput,
  txHash: string,
  txParams: LegacyTransactionParams,
  blockNumber?: number,
  blockHash?: string,
  txIndex?: number
) {
  assertTransaction(tx, txHash, txParams, blockNumber, blockHash, txIndex);

  assertQuantity(tx.gasPrice, txParams.gasPrice);
}

export function assertAccessListTransaction(
  tx: AccessListEIP2930RpcTransactionOutput,
  txHash: string,
  txParams: AccessListTransactionParams,
  blockNumber?: number,
  blockHash?: string,
  txIndex?: number
) {
  assertTransaction(tx, txHash, txParams, blockNumber, blockHash, txIndex);

  assert.equal(tx.type, "0x1");
  assertQuantity(tx.gasPrice, txParams.gasPrice);
  assertEqualAccessLists(tx.accessList ?? [], txParams.accessList);
}

export function assertEIP1559Transaction(
  tx: EIP1559RpcTransactionOutput,
  txHash: string,
  txParams: EIP1559TransactionParams,
  blockNumber?: number,
  blockHash?: string,
  txIndex?: number
) {
  assertTransaction(tx, txHash, txParams, blockNumber, blockHash, txIndex);

  assert.equal(tx.type, "0x2");
  assertQuantity(tx.maxFeePerGas, txParams.maxFeePerGas);
  assertQuantity(tx.maxPriorityFeePerGas, txParams.maxPriorityFeePerGas);
  assertEqualAccessLists(tx.accessList ?? [], txParams.accessList);
}

export function assertEqualAccessLists(
  txAccessList: RpcAccessListOutput,
  txParamsAccessList: AccessListBufferItem[]
) {
  assert.equal(txAccessList.length, txParamsAccessList.length);

  for (const [i, txAccessListItem] of txAccessList.entries()) {
    const txParamsAccessListItem = txParamsAccessList[i];

    assert.equal(
      txAccessListItem.address,
      bufferToHex(txParamsAccessListItem[0])
    );

    assert.deepEqual(
      txAccessListItem.storageKeys,
      txParamsAccessListItem[1].map(bufferToHex)
    );
  }
}

export async function assertLatestBlockNumber(
  provider: EthereumProvider,
  latestBlockNumber: number
) {
  const block = await provider.send("eth_getBlockByNumber", ["latest", false]);

  assert.isNotNull(block);
  assert.equal(block.number, numberToRpcQuantity(latestBlockNumber));
}

export async function assertContractFieldEqualNumber(
  provider: EthereumProvider,
  contractAddress: string,
  selector: string,
  expectedValue: bigint
) {
  const value = rpcDataToBigInt(
    await provider.send("eth_call", [
      {
        to: contractAddress,
        data: selector,
      },
    ])
  );
  assert.equal(value, expectedValue);
}

export async function assertAddressBalance(
  provider: EthereumProvider,
  address: string,
  expectedValue: bigint
) {
  const value = rpcQuantityToBigInt(
    await provider.send("eth_getBalance", [address])
  );
  assert.equal(value, expectedValue);
}

export async function assertEqualCode(
  provider: EthereumProvider,
  address1: string,
  address2: string
) {
  const code1 = await provider.send("eth_getCode", [address1]);
  const code2 = await provider.send("eth_getCode", [address2]);
  assert.equal(
    code1,
    code2,
    `Expected code in accounts ${address1} and ${address2} to be equal`
  );
}

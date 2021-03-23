import { assert } from "chai";
import { BN, bufferToHex } from "ethereumjs-util";

import {
  InvalidArgumentsError,
  InvalidInputError,
  MethodNotSupportedError,
} from "../../../../src/internal/hardhat-network/provider/errors";
import {
  rpcQuantity,
  RpcTransactionRequestInput,
} from "../../../../src/internal/hardhat-network/provider/input";
import { TransactionParams } from "../../../../src/internal/hardhat-network/provider/node-types";
import {
  numberToRpcQuantity,
  RpcReceiptOutput,
  RpcTransactionOutput,
} from "../../../../src/internal/hardhat-network/provider/output";
import { EthereumProvider } from "../../../../src/types";

export async function assertHardhatNetworkProviderError(
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
    if (code !== undefined) {
      assert.equal(error.code, code);
    }

    if (message !== undefined) {
      assert.include(error.message, message);
    }

    return;
  }

  assert.fail(
    `Method ${method} should have thrown [${code}] ${message} but returned ${res}`
  );
}

export async function assertNotSupported(
  provider: EthereumProvider,
  method: string
) {
  return assertHardhatNetworkProviderError(
    provider,
    method,
    [],
    `Method ${method} is not supported`,
    MethodNotSupportedError.CODE
  );
}

export async function assertInvalidArgumentsError(
  provider: EthereumProvider,
  method: string,
  params: any[] = [],
  message?: string
) {
  return assertHardhatNetworkProviderError(
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
  return assertHardhatNetworkProviderError(
    provider,
    method,
    params,
    message,
    InvalidInputError.CODE
  );
}

export function assertQuantity(
  actual: any,
  quantity: number | BN,
  message?: string
) {
  assert.strictEqual(actual, numberToRpcQuantity(quantity), message);
}

export async function assertNodeBalances(
  provider: EthereumProvider,
  expectedBalances: Array<number | BN>
) {
  const accounts: string[] = await provider.send("eth_accounts");

  const balances = await Promise.all(
    accounts.map((acc) => provider.send("eth_getBalance", [acc]))
  );

  assert.deepEqual(balances, expectedBalances.map(numberToRpcQuantity));
}

export async function assertPendingNodeBalances(
  provider: EthereumProvider,
  expectedBalances: Array<number | BN>
) {
  const accounts: string[] = await provider.send("eth_accounts");

  const balances = await Promise.all(
    accounts.map((acc) => provider.send("eth_getBalance", [acc, "pending"]))
  );

  assert.deepEqual(balances, expectedBalances.map(numberToRpcQuantity));
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
    if (code !== undefined) {
      assert.equal(error.code, code);
    }

    if (message !== undefined) {
      assert.include(error.message, message);
    }

    return;
  }

  assert.fail("Transaction should have failed");
}

export function assertReceiptMatchesGethOne(
  actual: any,
  gethReceipt: RpcReceiptOutput,
  expectedBlockNumber: number | BN
) {
  assertQuantity(actual.blockNumber, expectedBlockNumber);
  assert.strictEqual(actual.transactionIndex, gethReceipt.transactionIndex);
  assert.strictEqual(actual.to, gethReceipt.to);
  assert.strictEqual(actual.logsBloom, gethReceipt.logsBloom);
  assert.deepEqual(actual.logs, gethReceipt.logs);
  assert.strictEqual(actual.status, gethReceipt.status);
  assert.deepEqual(actual.cumulativeGasUsed, gethReceipt.cumulativeGasUsed);
}

export function assertTransaction(
  tx: RpcTransactionOutput,
  txHash: string,
  txParams: TransactionParams,
  blockNumber?: number,
  blockHash?: string,
  txIndex?: number
) {
  assert.equal(tx.from, bufferToHex(txParams.from));
  assertQuantity(tx.gas, txParams.gasLimit);
  assertQuantity(tx.gasPrice, txParams.gasPrice);
  assert.equal(tx.hash, txHash);
  assert.equal(tx.input, bufferToHex(txParams.data));
  assertQuantity(tx.nonce, txParams.nonce);
  assert.equal(
    tx.to,
    txParams.to.length === 0 ? null : bufferToHex(txParams.to)
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

export async function assertLatestBlockNumber(
  provider: EthereumProvider,
  latestBlockNumber: number
) {
  const block = await provider.send("eth_getBlockByNumber", ["latest", false]);

  assert.isNotNull(block);
  assert.equal(block.number, numberToRpcQuantity(latestBlockNumber));
}

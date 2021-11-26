import { Transaction } from "@ethereumjs/tx";
import { bufferToHex, toBuffer, zeroAddress } from "ethereumjs-util";

import { numberToRpcQuantity } from "../../../../src/internal/core/jsonrpc/types/base-types";
import { RpcTransactionRequestInput } from "../../../../src/internal/core/jsonrpc/types/input/transactionRequest";
import { TransactionParams } from "../../../../src/internal/hardhat-network/provider/node-types";
import { HardhatNetworkProvider } from "../../../../src/internal/hardhat-network/provider/provider";
import { EthereumProvider } from "../../../../src/types";

import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
} from "./providers";
import { retrieveCommon } from "./retrieveCommon";

export async function deployContract(
  provider: EthereumProvider,
  deploymentCode: string,
  from = DEFAULT_ACCOUNTS_ADDRESSES[0]
): Promise<string> {
  const hash = await provider.send("eth_sendTransaction", [
    {
      from,
      data: deploymentCode,
      gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT),
    },
  ]);

  const { contractAddress } = await provider.send("eth_getTransactionReceipt", [
    hash,
  ]);

  return contractAddress;
}

export async function sendTxToZeroAddress(
  provider: EthereumProvider,
  from?: string
): Promise<string> {
  const accounts = await provider.send("eth_accounts");

  const burnTxParams = {
    from: from ?? accounts[0],
    to: zeroAddress(),
    value: numberToRpcQuantity(1),
    gas: numberToRpcQuantity(21000),
    gasPrice: numberToRpcQuantity(10e9),
  };

  return provider.send("eth_sendTransaction", [burnTxParams]);
}

export async function sendTransactionFromTxParams(
  provider: EthereumProvider,
  txParams: TransactionParams
) {
  const rpcTxParams: RpcTransactionRequestInput = {
    from: bufferToHex(txParams.from),
    data: bufferToHex(txParams.data),
    nonce: numberToRpcQuantity(txParams.nonce),
    value: numberToRpcQuantity(txParams.value),
    gas: numberToRpcQuantity(txParams.gasLimit),
  };

  if ("accessList" in txParams) {
    rpcTxParams.accessList = txParams.accessList.map(
      ([address, storageKeys]) => ({
        address: bufferToHex(address),
        storageKeys: storageKeys.map(bufferToHex),
      })
    );
  }

  if ("gasPrice" in txParams) {
    rpcTxParams.gasPrice = numberToRpcQuantity(txParams.gasPrice);
  } else {
    rpcTxParams.maxFeePerGas = numberToRpcQuantity(txParams.maxFeePerGas);
    rpcTxParams.maxPriorityFeePerGas = numberToRpcQuantity(
      txParams.maxPriorityFeePerGas
    );
  }

  if (txParams.to !== undefined) {
    rpcTxParams.to = bufferToHex(txParams.to!);
  }
  return provider.send("eth_sendTransaction", [rpcTxParams]);
}

export async function getSignedTxHash(
  hardhatNetworkProvider: HardhatNetworkProvider,
  txParams: TransactionParams,
  signerAccountIndex: number
) {
  const txToSign = new Transaction(txParams, {
    common: await retrieveCommon(hardhatNetworkProvider),
  });

  const signedTx = txToSign.sign(
    toBuffer(DEFAULT_ACCOUNTS[signerAccountIndex].privateKey)
  );

  return bufferToHex(signedTx.hash());
}

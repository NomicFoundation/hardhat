import { Transaction } from "ethereumjs-tx";
import { bufferToHex, toBuffer, zeroAddress } from "ethereumjs-util";

import { TransactionParams } from "../../../../src/internal/hardhat-network/provider/node-types";
import { numberToRpcQuantity } from "../../../../src/internal/hardhat-network/provider/output";
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
    gasPrice: numberToRpcQuantity(1),
  };

  return provider.send("eth_sendTransaction", [burnTxParams]);
}

export async function sendTransactionFromTxParams(
  provider: EthereumProvider,
  txParams: TransactionParams
) {
  return provider.send("eth_sendTransaction", [
    {
      to: bufferToHex(txParams.to),
      from: bufferToHex(txParams.from),
      data: bufferToHex(txParams.data),
      nonce: numberToRpcQuantity(txParams.nonce),
      value: numberToRpcQuantity(txParams.value),
      gas: numberToRpcQuantity(txParams.gasLimit),
      gasPrice: numberToRpcQuantity(txParams.gasPrice),
    },
  ]);
}

export async function getSignedTxHash(
  hardhatNetworkProvider: HardhatNetworkProvider,
  txParams: TransactionParams,
  signerAccountIndex: number
) {
  const txToSign = new Transaction(txParams, {
    common: await retrieveCommon(hardhatNetworkProvider),
  });

  txToSign.sign(toBuffer(DEFAULT_ACCOUNTS[signerAccountIndex].privateKey));

  return bufferToHex(txToSign.hash(true));
}

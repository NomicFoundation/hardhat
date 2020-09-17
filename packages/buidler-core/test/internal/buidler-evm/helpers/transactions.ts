import { Transaction } from "ethereumjs-tx";
import { bufferToHex, toBuffer, zeroAddress } from "ethereumjs-util";

import { TransactionParams } from "../../../../src/internal/buidler-evm/provider/node-types";
import { numberToRpcQuantity } from "../../../../src/internal/buidler-evm/provider/output";
import { BuidlerEVMProvider } from "../../../../src/internal/buidler-evm/provider/provider";
import { EthereumProvider } from "../../../../src/types";

import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
} from "./providers";
import { retrieveCommon } from "./retrieveCommon";

export async function deployContract(
  provider: EthereumProvider,
  deploymentCode: string
) {
  const hash = await provider.send("eth_sendTransaction", [
    {
      from: DEFAULT_ACCOUNTS_ADDRESSES[0],
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
  provider: EthereumProvider
): Promise<string> {
  const accounts = await provider.send("eth_accounts");

  const burnTxParams = {
    from: accounts[0],
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
  buidlerEVMProvider: BuidlerEVMProvider,
  txParams: TransactionParams,
  signerAccountIndex: number
) {
  const txToSign = new Transaction(txParams, {
    common: await retrieveCommon(buidlerEVMProvider),
  });

  txToSign.sign(toBuffer(DEFAULT_ACCOUNTS[signerAccountIndex].privateKey));

  return bufferToHex(txToSign.hash(true));
}

import { ContractFactory, ethers } from "ethers";

import {
  GasAdapter,
  SignerAdapter,
  TransactionsAdapter,
} from "../../../types/adapters";

interface HighLevelTransaction {
  abi: any[];
  bytecode: string;
  args: any;
  value: bigint;
  from: string;
}

interface TransactionReceipt {
  contractAddress?: string;
}

export interface ChainDispatcher {
  sendTx({
    abi,
    bytecode,
    args,
    value,
    from,
  }: HighLevelTransaction): Promise<TransactionReceipt>;
}

/**
 * Dispatch and interact with the blockchain.
 *
 * @beta
 */
export class EthersChainDispatcher implements ChainDispatcher {
  constructor(
    private _signerLoader: SignerAdapter,
    private _gasProvider: GasAdapter,
    private _transactionProvider: TransactionsAdapter
  ) {}

  public async sendTx({
    abi,
    bytecode,
    args,
    value,
    from,
  }: HighLevelTransaction): Promise<TransactionReceipt> {
    const signer: ethers.Signer = await this._signerLoader.getSigner(from);

    const Factory = new ContractFactory(abi, bytecode, signer);

    const tx = Factory.getDeployTransaction(...args, {
      value,
    });

    // if (txOptions?.gasLimit !== undefined) {
    //   tx.gasLimit = ethers.BigNumber.from(txOptions.gasLimit);
    // }

    // if (txOptions?.gasPrice !== undefined) {
    //   tx.gasPrice = ethers.BigNumber.from(txOptions.gasPrice);
    // }

    if (tx.gasLimit === undefined) {
      const gasLimit = await this._gasProvider.estimateGasLimit(tx);

      tx.gasLimit = gasLimit;
    }

    if (tx.gasPrice === undefined) {
      const gasPrice = await this._gasProvider.estimateGasPrice();

      tx.gasPrice = gasPrice;
    }

    const response = await signer.sendTransaction(tx);

    const txHash = response.hash;

    const receipt = await this._transactionProvider.wait(txHash);

    return {
      contractAddress: receipt.contractAddress,
    };
  }
}

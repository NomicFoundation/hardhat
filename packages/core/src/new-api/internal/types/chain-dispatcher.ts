import { ethers } from "ethers";

import { ArgumentType } from "../../types/module";

export interface ChainDispatcher {
  allocateNextNonceForAccount(address: string): Promise<number>;

  constructDeployTransaction(
    byteCode: string,
    abi: any[],
    args: ArgumentType[],
    value: bigint,
    from: string
  ): Promise<ethers.providers.TransactionRequest>;

  constructCallTransaction(
    contractAddress: string,
    abi: any[],
    functionName: string,
    args: ArgumentType[],
    value: bigint,
    from: string
  ): Promise<ethers.providers.TransactionRequest>;

  sendTx(
    tx: ethers.providers.TransactionRequest,
    from: string
  ): Promise<string>;

  staticCallQuery(
    contractAddress: string,
    abi: any[],
    functionName: string,
    args: ArgumentType[],
    from: string
  ): Promise<any>;

  getTransactionReceipt(
    txHash: string
  ): Promise<ethers.providers.TransactionReceipt | null | undefined>;

  getEventArgument(
    eventName: string,
    argumentName: string,
    txToReadFrom: string,
    eventIndex: number,
    emitterAddress: string,
    abi: any[]
  ): Promise<any>;
}

import { FutureProcessor } from "../../../src/internal/execution/future-processor/future-processor";
import {
  Block,
  CallParams,
  EstimateGasParams,
  JsonRpcClient,
  TransactionParams,
} from "../../../src/internal/execution/jsonrpc-client";
import { NonceManager } from "../../../src/internal/execution/nonce-management/json-rpc-nonce-manager";
import { TransactionTrackingTimer } from "../../../src/internal/execution/transaction-tracking-timer";
import {
  NetworkFees,
  RawStaticCallResult,
  Transaction,
  TransactionReceipt,
} from "../../../src/internal/execution/types/jsonrpc";
import { getDefaultSender } from "../../../src/internal/execution/utils/get-default-sender";
import { MemoryJournal } from "../../../src/internal/journal/memory-journal";
import { assertIgnitionInvariant } from "../../../src/internal/utils/assertions";
import { BasicStrategy } from "../../../src/strategies/basic-strategy";
import {
  exampleAccounts,
  setupMockArtifactResolver,
  setupMockDeploymentLoader,
} from "../../helpers";

export async function setupFutureProcessor(
  sendTransaction: (transactionParams: TransactionParams) => Promise<string>,
  transactions: { [key: string]: TransactionReceipt }
): Promise<{
  processor: FutureProcessor;
  storedDeployedAddresses: { [key: string]: string };
}> {
  const storedDeployedAddresses: { [key: string]: string } = {};

  const mockDeploymentLoader = setupMockDeploymentLoader(
    new MemoryJournal(),
    storedDeployedAddresses
  );

  const mockArtifactResolver = setupMockArtifactResolver();

  const mockJsonRpcClient = setupMockJsonRpcClient(
    sendTransaction,
    transactions
  );

  const basicExecutionStrategy = new BasicStrategy();
  await basicExecutionStrategy.init(mockDeploymentLoader, mockJsonRpcClient);

  const transactionTrackingTimer = new TransactionTrackingTimer();

  const mockNonceManager = setupMockNonceManager();

  const processor = new FutureProcessor(
    mockDeploymentLoader,
    mockArtifactResolver,
    basicExecutionStrategy,
    mockJsonRpcClient,
    transactionTrackingTimer,
    mockNonceManager,
    1, // required confirmations
    10, // millisecondBeforeBumpingFees
    100, // maxFeeBumps
    exampleAccounts,
    {},
    getDefaultSender(exampleAccounts),
    false // disableFeeBumping
  );

  return { processor, storedDeployedAddresses };
}

function setupMockNonceManager(): NonceManager {
  let nonceCount = 0;
  return {
    getNextNonce: async (_sender: string): Promise<number> => {
      return nonceCount++;
    },
    revertNonce: (_sender: string): void => {
      nonceCount--;
    },
  };
}

function setupMockJsonRpcClient(
  sendTransaction: (transactionParams: TransactionParams) => Promise<string>,
  transactions: { [key: string]: TransactionReceipt }
): JsonRpcClient {
  const client = new MockJsonRpcClient(sendTransaction, transactions);

  return client;
}

class MockJsonRpcClient implements JsonRpcClient {
  #blockNumber = 10;
  #transactions: { [key: string]: TransactionReceipt };
  #sendTransaction: (transactionParams: TransactionParams) => Promise<string>;

  constructor(
    sendTransaction: (transactionParams: TransactionParams) => Promise<string>,
    transactions: { [key: string]: TransactionReceipt }
  ) {
    this.#sendTransaction = sendTransaction;
    this.#transactions = transactions;
  }

  public async getChainId(): Promise<number> {
    return 31337;
  }

  public async getNetworkFees(): Promise<NetworkFees> {
    return {
      gasPrice: 1000n,
    };
  }

  public async getLatestBlock(): Promise<Block> {
    const blockNumber = this.#blockNumber++;

    return {
      hash: `0xblockhash-${blockNumber}`,
      number: blockNumber,
    };
  }

  public getBalance(
    _address: string,
    _blockTag: "latest" | "pending"
  ): Promise<bigint> {
    throw new Error("Method not implemented.");
  }

  public setBalance(_address: string, _balance: bigint): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  public async call(
    _callParams: CallParams,
    _blockTag: "latest" | "pending"
  ): Promise<RawStaticCallResult> {
    return {
      success: true,
      customErrorReported: false,
      returnData: "0x",
    };
  }

  public async estimateGas(
    _transactionParams: EstimateGasParams
  ): Promise<bigint> {
    return 100n;
  }

  public async sendTransaction(
    transactionParams: TransactionParams
  ): Promise<string> {
    return this.#sendTransaction(transactionParams);
  }

  public async sendRawTransaction(_presignedTx: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  public getTransactionCount(
    _address: string,
    _blockTag: number | "latest" | "pending"
  ): Promise<number> {
    throw new Error("Method not implemented.");
  }

  public async getTransaction(
    txHash: string
  ): Promise<Omit<Transaction, "receipt"> | undefined> {
    return {
      hash: txHash,
      fees: {
        gasPrice: 1000n,
      },
    };
  }

  public async getTransactionReceipt(
    txHash: string
  ): Promise<TransactionReceipt | undefined> {
    assertIgnitionInvariant(
      txHash in this.#transactions,
      `No transaction registered in test for the hash ${txHash}`
    );

    return this.#transactions[txHash];
  }

  public async getCode(_address: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
}

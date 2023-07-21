import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { Address } from "@nomicfoundation/ethereumjs-util";
import { transactionDifferences } from "../utils/assertions";
import { MemPoolAdapter } from "../mem-pool";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

export class DualMemPool implements MemPoolAdapter {
  constructor(
    private readonly _ethereumJS: MemPoolAdapter,
    private readonly _rethnet: MemPoolAdapter
  ) {}

  public async getBlockGasLimit(): Promise<bigint> {
    const ethereumJS = await this._ethereumJS.getBlockGasLimit();
    const rethnet = await this._rethnet.getBlockGasLimit();

    if (ethereumJS !== rethnet) {
      console.trace(
        `Different blockGasLimit: ${ethereumJS} (ethereumjs) !== ${rethnet} (rethnet)`
      );
      throw new Error("Different blockGasLimit");
    }

    return rethnet;
  }

  public async setBlockGasLimit(blockGasLimit: bigint): Promise<void> {
    await this._ethereumJS.setBlockGasLimit(blockGasLimit);
    await this._rethnet.setBlockGasLimit(blockGasLimit);
  }

  public async getNextPendingNonce(accountAddress: Address): Promise<bigint> {
    const ethereumJS = await this._ethereumJS.getNextPendingNonce(
      accountAddress
    );
    const rethnet = await this._rethnet.getNextPendingNonce(accountAddress);

    if (ethereumJS !== rethnet) {
      console.trace(
        `Different nextPendingNonce: ${ethereumJS} (ethereumjs) !== ${rethnet} (rethnet)`
      );
      throw new Error("Different nextPendingNonce");
    }

    return rethnet;
  }

  public async addTransaction(transaction: TypedTransaction): Promise<void> {
    await this._ethereumJS.addTransaction(transaction);
    await this._rethnet.addTransaction(transaction);
  }

  public async removeTransaction(hash: Buffer): Promise<boolean> {
    const ethereumJSRemoved = await this._ethereumJS.removeTransaction(hash);
    const rethnetRemoved = await this._rethnet.removeTransaction(hash);

    if (ethereumJSRemoved !== rethnetRemoved) {
      console.trace(
        `Different removed: ${ethereumJSRemoved} (ethereumjs) !== ${rethnetRemoved} (rethnet)`
      );
      throw new Error("Different removed");
    }

    return rethnetRemoved;
  }

  public async update(): Promise<void> {
    await this._ethereumJS.update();
    await this._rethnet.update();
  }

  public async getTransactions(): Promise<TypedTransaction[]> {
    const ethereumJSTransactions = await this._ethereumJS.getTransactions();
    const rethnetTransactions = await this._rethnet.getTransactions();

    const differences: string[] = [];
    if (ethereumJSTransactions.length !== rethnetTransactions.length) {
      console.log(
        `Different transactions length: ${ethereumJSTransactions.length} (ethereumjs) !== ${rethnetTransactions.length} (rethnet)`
      );
      differences.push("transactions.length");
    }

    for (
      let transactionIdx = 0;
      transactionIdx < ethereumJSTransactions.length;
      ++transactionIdx
    ) {
      const txDifferences = transactionDifferences(
        ethereumJSTransactions[transactionIdx],
        rethnetTransactions[transactionIdx]
      );

      if (txDifferences.length > 0) {
        console.log(
          `Different transaction[${transactionIdx}]: ${transactionDifferences}`
        );
        differences.push("transactions");
      }
    }

    if (differences.length !== 0) {
      throw new Error(`Different transactions: ${differences}`);
    }

    return rethnetTransactions;
  }

  public async getFutureTransactions(): Promise<TypedTransaction[]> {
    const ethereumJSTransactions =
      await this._ethereumJS.getFutureTransactions();
    const rethnetTransactions = await this._rethnet.getFutureTransactions();

    const differences: string[] = [];
    if (ethereumJSTransactions.length !== rethnetTransactions.length) {
      console.log(
        `Different transactions length: ${ethereumJSTransactions.length} (ethereumjs) !== ${rethnetTransactions.length} (rethnet)`
      );
      differences.push("transactions.length");
    }

    for (
      let transactionIdx = 0;
      transactionIdx < ethereumJSTransactions.length;
      ++transactionIdx
    ) {
      const txDifferences = transactionDifferences(
        ethereumJSTransactions[transactionIdx],
        rethnetTransactions[transactionIdx]
      );

      if (txDifferences.length > 0) {
        console.log(
          `Different transaction[${transactionIdx}]: ${transactionDifferences}`
        );
        differences.push("transactions");
      }
    }

    if (differences.length !== 0) {
      throw new Error(`Different transactions: ${differences}`);
    }

    return rethnetTransactions;
  }

  public async getPendingTransactions(): Promise<TypedTransaction[]> {
    const ethereumJSTransactions =
      await this._ethereumJS.getPendingTransactions();
    const rethnetTransactions = await this._rethnet.getPendingTransactions();

    const differences: string[] = [];
    if (ethereumJSTransactions.length !== rethnetTransactions.length) {
      console.log(
        `Different transactions length: ${ethereumJSTransactions.length} (ethereumjs) !== ${rethnetTransactions.length} (rethnet)`
      );
      differences.push("transactions.length");
    }

    for (
      let transactionIdx = 0;
      transactionIdx < ethereumJSTransactions.length;
      ++transactionIdx
    ) {
      const txDifferences = transactionDifferences(
        ethereumJSTransactions[transactionIdx],
        rethnetTransactions[transactionIdx]
      );

      if (txDifferences.length > 0) {
        console.log(
          `Different transaction[${transactionIdx}]: ${transactionDifferences}`
        );
        differences.push("transactions");
      }
    }

    if (differences.length !== 0) {
      throw new Error(`Different transactions: ${differences}`);
    }

    return rethnetTransactions;
  }

  public async getTransactionByHash(
    hash: Buffer
  ): Promise<TypedTransaction | undefined> {
    const ethereumJSTransaction = await this._ethereumJS.getTransactionByHash(
      hash
    );
    const rethnetTransaction = await this._rethnet.getTransactionByHash(hash);

    if (ethereumJSTransaction === undefined) {
      if (rethnetTransaction !== undefined) {
        throw new Error(
          "ethereumJSTransaction is undefined but rethnetTransaction is defined"
        );
      }
    } else {
      if (rethnetTransaction === undefined) {
        throw new Error(
          "ethereumJSTransaction is defined but rethnetTransaction is undefined"
        );
      }
      const differences = transactionDifferences(
        ethereumJSTransaction,
        rethnetTransaction
      );

      if (differences.length > 0) {
        console.log(`Different transaction: ${transactionDifferences}`);
        throw new Error(`Different transaction: ${differences}`);
      }
    }

    return rethnetTransaction;
  }

  public async hasFutureTransactions(): Promise<boolean> {
    const ethereumJS = await this._ethereumJS.hasFutureTransactions();
    const rethnet = await this._rethnet.hasFutureTransactions();

    if (ethereumJS !== rethnet) {
      console.trace(
        `Different hasFutureTransactions: ${ethereumJS} (ethereumjs) !== ${rethnet} (rethnet)`
      );
      throw new Error("Different hasFutureTransactions");
    }

    return rethnet;
  }

  public async hasPendingTransactions(): Promise<boolean> {
    const ethereumJS = await this._ethereumJS.hasPendingTransactions();
    const rethnet = await this._rethnet.hasPendingTransactions();

    if (ethereumJS !== rethnet) {
      console.trace(
        `Different hasPendingTransactions: ${ethereumJS} (ethereumjs) !== ${rethnet} (rethnet)`
      );
      throw new Error("Different hasPendingTransactions");
    }

    return rethnet;
  }

  public async makeSnapshot(): Promise<number> {
    const ethereumJS = await this._ethereumJS.makeSnapshot();
    const rethnet = await this._rethnet.makeSnapshot();

    if (ethereumJS !== rethnet) {
      console.trace(
        `Different snapshotId: ${ethereumJS} (ethereumjs) !== ${rethnet} (rethnet)`
      );
      throw new Error("Different snapshotId");
    }

    return rethnet;
  }

  public async revertToSnapshot(snapshotId: number): Promise<void> {
    await this._ethereumJS.revertToSnapshot(snapshotId);
    await this._rethnet.revertToSnapshot(snapshotId);
  }
}

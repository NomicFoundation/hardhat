import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { Address } from "@nomicfoundation/ethereumjs-util";
import { transactionDifferences } from "../utils/assertions";
import { MemPoolAdapter } from "../mem-pool";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

export class DualMemPool implements MemPoolAdapter {
  constructor(
    private readonly _ethereumJS: MemPoolAdapter,
    private readonly _edr: MemPoolAdapter
  ) {}

  public async getBlockGasLimit(): Promise<bigint> {
    const ethereumJS = await this._ethereumJS.getBlockGasLimit();
    const edr = await this._edr.getBlockGasLimit();

    if (ethereumJS !== edr) {
      console.trace(
        `Different blockGasLimit: ${ethereumJS} (ethereumjs) !== ${edr} (edr)`
      );
      throw new Error("Different blockGasLimit");
    }

    return edr;
  }

  public async setBlockGasLimit(blockGasLimit: bigint): Promise<void> {
    await this._ethereumJS.setBlockGasLimit(blockGasLimit);
    await this._edr.setBlockGasLimit(blockGasLimit);
  }

  public async getNextPendingNonce(accountAddress: Address): Promise<bigint> {
    const ethereumJS = await this._ethereumJS.getNextPendingNonce(
      accountAddress
    );
    const edr = await this._edr.getNextPendingNonce(accountAddress);

    if (ethereumJS !== edr) {
      console.trace(
        `Different nextPendingNonce: ${ethereumJS} (ethereumjs) !== ${edr} (edr)`
      );
      throw new Error("Different nextPendingNonce");
    }

    return edr;
  }

  public async addTransaction(transaction: TypedTransaction): Promise<void> {
    await this._ethereumJS.addTransaction(transaction);
    await this._edr.addTransaction(transaction);
  }

  public async removeTransaction(hash: Buffer): Promise<boolean> {
    const ethereumJSRemoved = await this._ethereumJS.removeTransaction(hash);
    const edrRemoved = await this._edr.removeTransaction(hash);

    if (ethereumJSRemoved !== edrRemoved) {
      console.trace(
        `Different removed: ${ethereumJSRemoved} (ethereumjs) !== ${edrRemoved} (edr)`
      );
      throw new Error("Different removed");
    }

    return edrRemoved;
  }

  public async update(): Promise<void> {
    await this._ethereumJS.update();
    await this._edr.update();
  }

  public async getTransactions(): Promise<TypedTransaction[]> {
    const ethereumJSTransactions = await this._ethereumJS.getTransactions();
    const edrTransactions = await this._edr.getTransactions();

    const differences: string[] = [];
    if (ethereumJSTransactions.length !== edrTransactions.length) {
      console.log(
        `Different transactions length: ${ethereumJSTransactions.length} (ethereumjs) !== ${edrTransactions.length} (edr)`
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
        edrTransactions[transactionIdx]
      );

      if (txDifferences.length > 0) {
        console.log(
          `Different transaction[${transactionIdx}]: ${txDifferences}`
        );
        differences.push("transactions");
      }
    }

    if (differences.length !== 0) {
      console.trace(`Different transactions: ${differences}`);
      throw new Error(`Different transactions: ${differences}`);
    }

    return edrTransactions;
  }

  public async getTransactionByHash(
    hash: Buffer
  ): Promise<TypedTransaction | undefined> {
    const ethereumJSTransaction = await this._ethereumJS.getTransactionByHash(
      hash
    );
    const edrTransaction = await this._edr.getTransactionByHash(hash);

    if (ethereumJSTransaction === undefined) {
      if (edrTransaction !== undefined) {
        throw new Error(
          "ethereumJSTransaction is undefined but edrTransaction is defined"
        );
      }
    } else {
      if (edrTransaction === undefined) {
        throw new Error(
          "ethereumJSTransaction is defined but edrTransaction is undefined"
        );
      }
      const differences = transactionDifferences(
        ethereumJSTransaction,
        edrTransaction
      );

      if (differences.length > 0) {
        console.log(`Different transaction: ${differences}`);
        throw new Error(`Different transaction: ${differences}`);
      }
    }

    return edrTransaction;
  }

  public async hasFutureTransactions(): Promise<boolean> {
    const ethereumJS = await this._ethereumJS.hasFutureTransactions();
    const edr = await this._edr.hasFutureTransactions();

    if (ethereumJS !== edr) {
      console.trace(
        `Different hasFutureTransactions: ${ethereumJS} (ethereumjs) !== ${edr} (edr)`
      );
      throw new Error("Different hasFutureTransactions");
    }

    return edr;
  }

  public async hasPendingTransactions(): Promise<boolean> {
    const ethereumJS = await this._ethereumJS.hasPendingTransactions();
    const edr = await this._edr.hasPendingTransactions();

    if (ethereumJS !== edr) {
      console.trace(
        `Different hasPendingTransactions: ${ethereumJS} (ethereumjs) !== ${edr} (edr)`
      );
      throw new Error("Different hasPendingTransactions");
    }

    return edr;
  }

  public async makeSnapshot(): Promise<number> {
    const ethereumJS = await this._ethereumJS.makeSnapshot();
    const edr = await this._edr.makeSnapshot();

    if (ethereumJS !== edr) {
      console.trace(
        `Different snapshotId: ${ethereumJS} (ethereumjs) !== ${edr} (edr)`
      );
      throw new Error("Different snapshotId");
    }

    return edr;
  }

  public async revertToSnapshot(snapshotId: number): Promise<void> {
    await this._ethereumJS.revertToSnapshot(snapshotId);
    await this._edr.revertToSnapshot(snapshotId);
  }
}

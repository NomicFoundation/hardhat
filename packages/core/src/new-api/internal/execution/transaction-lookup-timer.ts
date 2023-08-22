import { assertIgnitionInvariant } from "../utils/assertions";

import { TransactionLookup, TransactionLookupTimer } from "./types";

type TransactionLookupEntry = TransactionLookup & {
  start: Date;
};

export class TransactionLookupTimerImpl implements TransactionLookupTimer {
  private _startTimes: { [key: string]: TransactionLookupEntry };

  constructor(private _timeoutInMilliseconds: number) {
    this._startTimes = {};
  }

  public registerStartTimeIfNeeded({
    txHash,
    futureId,
    executionId,
  }: TransactionLookup): void {
    if (txHash in this._startTimes) {
      return;
    }

    this._startTimes[txHash] = {
      txHash,
      futureId,
      executionId,
      start: new Date(),
    };
  }

  public isTimedOut(txHash: string): boolean {
    assertIgnitionInvariant(
      txHash in this._startTimes,
      "Cannot calculate timeout if start time not set"
    );

    const startTime = this._startTimes[txHash].start.getTime();
    const currentTime = new Date().getTime();

    return currentTime - startTime > this._timeoutInMilliseconds;
  }

  public getTimedOutTransactions(): TransactionLookup[] {
    return Object.keys(this._startTimes)
      .filter((txHash) => this.isTimedOut(txHash))
      .map((txHash) => this._startTimes[txHash])
      .map(({ futureId, executionId, txHash }) => ({
        futureId,
        executionId,
        txHash,
      }));
  }
}

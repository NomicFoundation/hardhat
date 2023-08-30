/**
 * This class is used to track the time that we have been waiting for
 * a transaction to confirm since it was either sent, or since Ignition started
 * and it was already sent.
 *
 * Note: This class doesn't have a method to clear the timer for a transaction
 * but it shouldn't be problematic.
 */
export class TransactionTrackingTimer {
  private readonly _defaultStart: number = Date.now();

  private readonly _transactionTrackingTimes: {
    [txHash: string]: number;
  } = {};

  /**
   * Adds a new transaction to track.
   */
  public addTransaction(txHash: string) {
    this._transactionTrackingTimes[txHash] = Date.now();
  }

  /**
   * Returns the time that we have been waiting for a transaction to confirm
   */
  public getTransactionTrackingTime(txHash: string): number {
    const start = this._transactionTrackingTimes[txHash] ?? this._defaultStart;

    return Date.now() - start;
  }
}

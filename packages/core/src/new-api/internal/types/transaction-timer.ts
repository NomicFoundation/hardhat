export interface TransactionLookup {
  futureId: string;
  executionId: number;
  txHash: string;
}

export interface TransactionLookupTimer {
  /**
   * Register the start time of a transaction lookup.
   *
   * The registration is idempotent.
   *
   * @param txHash - the transaction hash being looked up.
   */
  registerStartTimeIfNeeded(transactionLookup: TransactionLookup): void;

  /**
   * Based on the registered start time of the transaction lookup, determine
   * whether it has timed out.
   *
   * @param txHash  - the transaction hash being looked up.
   * @result whether the transaction lookup has timed out.
   */
  isTimedOut(txHash: string): boolean;

  /**
   * Get all the currently timed out transactions.
   *
   * @result the currently timed out transactions.
   */
  getTimedOutTransactions(): TransactionLookup[];
}

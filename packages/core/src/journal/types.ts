export interface JournalEntry {
  txHash: string;
  blockNumberWhenSent: number;
}

/**
 * A journal keeps track of all the transactions sent during a deployment. If a
 * deployment is interrupted and resumed later for any reason, the journal can
 * then be used to avoid re-sending transactions if possible.
 */
export interface Journal {
  addEntry(
    recipeId: string,
    executorId: string,
    entry: JournalEntry
  ): Promise<number>;
  getEntry(
    recipeId: string,
    executorId: string,
    entryIndex: number
  ): Promise<JournalEntry | undefined>;
  replaceEntry(
    recipeId: string,
    executorId: string,
    entryIndex: number,
    entry: JournalEntry
  ): Promise<void>;
  delete(recipeId: string): Promise<void>;
}

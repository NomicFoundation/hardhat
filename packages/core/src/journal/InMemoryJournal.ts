import setupDebug from "debug";

import { Journal, JournalEntry } from "./types";

export class InMemoryJournal implements Journal {
  private _log: debug.IDebugger = setupDebug(
    "ignition:journal:in-memory-journal"
  );
  private _journal: Map<string, Map<string, JournalEntry[]>> = new Map();

  public async addEntry(
    recipeId: string,
    executorId: string,
    journalEntry: JournalEntry
  ): Promise<number> {
    this._log(`Adding entry to ${recipeId}/${executorId}`);

    const recipeEntry: Map<string, JournalEntry[]> =
      this._journal.get(recipeId) ?? new Map();
    const executorEntries = recipeEntry.get(executorId) ?? [];

    executorEntries.push(journalEntry);

    recipeEntry.set(executorId, executorEntries);
    this._journal.set(recipeId, recipeEntry);

    return executorEntries.length - 1;
  }

  public async getEntry(
    recipeId: string,
    executorId: string,
    entryIndex: number
  ): Promise<JournalEntry | undefined> {
    this._log(`Getting entry ${entryIndex} from ${recipeId}/${executorId}`);

    return this._journal.get(recipeId)?.get(executorId)?.[entryIndex];
  }

  public async replaceEntry(
    recipeId: string,
    executorId: string,
    txIndex: number,
    entryIndex: JournalEntry
  ): Promise<void> {
    this._log(`Replacing entry ${txIndex} from ${recipeId}/${executorId}`);

    const transactions = this._journal.get(recipeId)?.get(executorId);
    if (transactions === undefined || transactions[txIndex] === undefined) {
      throw new Error(`Assertion error: replacing non-existent transaction`);
    }

    transactions[txIndex] = entryIndex;
  }

  public async delete(recipeId: string) {
    this._log(`Deleting recipe ${recipeId}`);

    this._journal.delete(recipeId);
  }
}

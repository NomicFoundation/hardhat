import setupDebug from "debug";

import { Journal, JournalEntry } from "./types";

export class InMemoryJournal implements Journal {
  private _log: debug.IDebugger = setupDebug(
    "ignition:journal:in-memory-journal"
  );
  private _journal: Map<string, Map<string, JournalEntry[]>> = new Map();

  public async addEntry(
    moduleId: string,
    executorId: string,
    journalEntry: JournalEntry
  ): Promise<number> {
    this._log(`Adding entry to ${moduleId}/${executorId}`);

    const moduleEntry: Map<string, JournalEntry[]> =
      this._journal.get(moduleId) ?? new Map();
    const executorEntries = moduleEntry.get(executorId) ?? [];

    executorEntries.push(journalEntry);

    moduleEntry.set(executorId, executorEntries);
    this._journal.set(moduleId, moduleEntry);

    return executorEntries.length - 1;
  }

  public async getEntry(
    moduleId: string,
    executorId: string,
    entryIndex: number
  ): Promise<JournalEntry | undefined> {
    this._log(`Getting entry ${entryIndex} from ${moduleId}/${executorId}`);

    return this._journal.get(moduleId)?.get(executorId)?.[entryIndex];
  }

  public async replaceEntry(
    moduleId: string,
    executorId: string,
    txIndex: number,
    entryIndex: JournalEntry
  ): Promise<void> {
    this._log(`Replacing entry ${txIndex} from ${moduleId}/${executorId}`);

    const transactions = this._journal.get(moduleId)?.get(executorId);
    if (transactions === undefined || transactions[txIndex] === undefined) {
      throw new Error(`Assertion error: replacing non-existent transaction`);
    }

    transactions[txIndex] = entryIndex;
  }

  public async delete(moduleId: string) {
    this._log(`Deleting module ${moduleId}`);

    this._journal.delete(moduleId);
  }
}

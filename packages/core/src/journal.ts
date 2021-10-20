import debug from "debug";
import fsExtra from "fs-extra";

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
    moduleId: string,
    executorId: string,
    entry: JournalEntry
  ): Promise<number>;
  getEntry(
    moduleId: string,
    executorId: string,
    entryIndex: number
  ): Promise<JournalEntry | undefined>;
  replaceEntry(
    moduleId: string,
    executorId: string,
    entryIndex: number,
    entry: JournalEntry
  ): Promise<void>;
  delete(moduleId: string): Promise<void>;
}

export class FileJournal implements Journal {
  private _log: debug.IDebugger = debug("ignition:journal:file-journal");

  constructor(private _path: string) {}

  public async addEntry(
    moduleId: string,
    executorId: string,
    journalEntry: JournalEntry
  ): Promise<number> {
    this._log(`Adding entry to ${moduleId}/${executorId}`);

    let content;
    if (await fsExtra.pathExists(this._path)) {
      content = await fsExtra.readJson(this._path);
    } else {
      content = {};
    }

    content[moduleId] = content[moduleId] ?? {};
    content[moduleId][executorId] = content[moduleId][executorId] ?? [];
    content[moduleId][executorId].push(journalEntry);

    await fsExtra.writeJson(this._path, content, {
      spaces: 2,
    });

    return content[moduleId][executorId].length - 1;
  }

  public async getEntry(
    moduleId: string,
    executorId: string,
    entryIndex: number
  ): Promise<JournalEntry | undefined> {
    this._log(`Getting entry ${entryIndex} from ${moduleId}/${executorId}`);

    if (!(await fsExtra.pathExists(this._path))) {
      return;
    }
    const content = await fsExtra.readJson(this._path);

    return content?.[moduleId]?.[executorId]?.[entryIndex];
  }

  public async replaceEntry(
    moduleId: string,
    executorId: string,
    txIndex: number,
    journalEntry: JournalEntry
  ): Promise<void> {
    this._log(`Replacing entry ${txIndex} from ${moduleId}/${executorId}`);

    let content;
    if (await fsExtra.pathExists(this._path)) {
      content = await fsExtra.readJson(this._path);
    } else {
      content = {};
    }

    if (content[moduleId]?.[executorId]?.[txIndex] === undefined) {
      throw new Error(`Assertion error: replacing non-existent transaction`);
    }

    content[moduleId][executorId][txIndex] = journalEntry;

    await fsExtra.writeJson(this._path, content, {
      spaces: 2,
    });
  }

  public async delete(moduleId: string) {
    this._log(`Deleting module ${moduleId}`);

    if (!(await fsExtra.pathExists(this._path))) {
      return;
    }

    const content = await fsExtra.readJson(this._path);
    delete content?.[moduleId];

    if (Object.entries(content).length === 0) {
      await fsExtra.remove(this._path);
    } else {
      await fsExtra.writeJson(this._path, content, {
        spaces: 2,
      });
    }
  }
}

/**
 * Journal implementation that just no-ops for every method.
 * Used when journaling is disabled.
 */
export class NullJournal implements Journal {
  private _log: debug.IDebugger = debug("ignition:journal:null-journal");

  public async addEntry(
    moduleId: string,
    executorId: string,
    _journalEntry: JournalEntry
  ): Promise<number> {
    this._log(`Adding entry to ${moduleId}/${executorId}`);
    return -1;
  }

  public async getEntry(
    moduleId: string,
    executorId: string,
    entryIndex: number
  ): Promise<JournalEntry | undefined> {
    this._log(`Getting entry ${entryIndex} from ${moduleId}/${executorId}`);
    return undefined;
  }

  public async replaceEntry(
    moduleId: string,
    executorId: string,
    txIndex: number,
    _entryIndex: JournalEntry
  ): Promise<void> {
    this._log(`Replacing entry ${txIndex} from ${moduleId}/${executorId}`);
  }

  public async delete(moduleId: string): Promise<void> {
    this._log(`Deleting module ${moduleId}`);
  }
}

export class InMemoryJournal implements Journal {
  private _log: debug.IDebugger = debug("ignition:journal:in-memory-journal");
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

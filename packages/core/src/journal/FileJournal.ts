import setupDebug, { IDebugger } from "debug";
import fsExtra from "fs-extra";

import { Journal, JournalEntry } from "./types";

export class FileJournal implements Journal {
  private _log: IDebugger = setupDebug("ignition:journal:file-journal");

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

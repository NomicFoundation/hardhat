import setupDebug, { IDebugger } from "debug";
import fsExtra from "fs-extra";

import { Journal, JournalEntry } from "./types";

export class FileJournal implements Journal {
  private _log: IDebugger = setupDebug("ignition:journal:file-journal");

  constructor(private _path: string) {}

  public async addEntry(
    recipeId: string,
    executorId: string,
    journalEntry: JournalEntry
  ): Promise<number> {
    this._log(`Adding entry to ${recipeId}/${executorId}`);

    let content;
    if (await fsExtra.pathExists(this._path)) {
      content = await fsExtra.readJson(this._path);
    } else {
      content = {};
    }

    content[recipeId] = content[recipeId] ?? {};
    content[recipeId][executorId] = content[recipeId][executorId] ?? [];
    content[recipeId][executorId].push(journalEntry);

    await fsExtra.writeJson(this._path, content, {
      spaces: 2,
    });

    return content[recipeId][executorId].length - 1;
  }

  public async getEntry(
    recipeId: string,
    executorId: string,
    entryIndex: number
  ): Promise<JournalEntry | undefined> {
    this._log(`Getting entry ${entryIndex} from ${recipeId}/${executorId}`);

    if (!(await fsExtra.pathExists(this._path))) {
      return;
    }
    const content = await fsExtra.readJson(this._path);

    return content?.[recipeId]?.[executorId]?.[entryIndex];
  }

  public async replaceEntry(
    recipeId: string,
    executorId: string,
    txIndex: number,
    journalEntry: JournalEntry
  ): Promise<void> {
    this._log(`Replacing entry ${txIndex} from ${recipeId}/${executorId}`);

    let content;
    if (await fsExtra.pathExists(this._path)) {
      content = await fsExtra.readJson(this._path);
    } else {
      content = {};
    }

    if (content[recipeId]?.[executorId]?.[txIndex] === undefined) {
      throw new Error(`Assertion error: replacing non-existent transaction`);
    }

    content[recipeId][executorId][txIndex] = journalEntry;

    await fsExtra.writeJson(this._path, content, {
      spaces: 2,
    });
  }

  public async delete(recipeId: string) {
    this._log(`Deleting recipe ${recipeId}`);

    if (!(await fsExtra.pathExists(this._path))) {
      return;
    }

    const content = await fsExtra.readJson(this._path);
    delete content?.[recipeId];

    if (Object.entries(content).length === 0) {
      await fsExtra.remove(this._path);
    } else {
      await fsExtra.writeJson(this._path, content, {
        spaces: 2,
      });
    }
  }
}

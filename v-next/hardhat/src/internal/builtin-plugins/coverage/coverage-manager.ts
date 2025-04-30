import type {
  CoverageData,
  CoverageManager,
  CoverageMetadata,
} from "./types.js";

import path from "node:path";

import {
  ensureDir,
  getAllFilesMatching,
  readJsonFile,
  remove,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";

export class CoverageManagerImplementation implements CoverageManager {
  readonly #metadata: CoverageMetadata = [];
  readonly #coveragePath: string;

  #data: CoverageData = [];
  #dataPath: string | undefined;

  constructor(coveragePath: string) {
    this.#coveragePath = coveragePath;
  }

  async #getDataPath(): Promise<string> {
    if (this.#dataPath === undefined) {
      const dataPath = path.join(this.#coveragePath, "data");
      await ensureDir(dataPath);
      this.#dataPath = dataPath;
    }

    return this.#dataPath;
  }

  public async addData(data: CoverageData): Promise<void> {
    this.#data.push(...data);
  }

  public async saveData(): Promise<void> {
    const dataPath = await this.#getDataPath();
    const filePath = path.join(dataPath, `${crypto.randomUUID()}.json`);
    await writeJsonFile(filePath, this.#data);
  }

  public async loadData(): Promise<void> {
    const dataPath = await this.#getDataPath();
    const filePaths = await getAllFilesMatching(dataPath);
    const data = [];
    for (const filePath of filePaths) {
      const partialData = await readJsonFile<CoverageData>(filePath);
      data.push(...partialData);
    }
    this.#data = data;
  }

  public async clearData(): Promise<void> {
    const dataPath = await this.#getDataPath();
    await remove(dataPath);
    await ensureDir(dataPath);
    this.#data = [];
  }

  public async addMetadata(metadata: CoverageMetadata): Promise<void> {
    this.#metadata.push(...metadata);
  }
}

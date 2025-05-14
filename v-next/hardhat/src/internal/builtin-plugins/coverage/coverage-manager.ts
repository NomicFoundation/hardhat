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
import debug from "debug";

const log = debug("hardhat:core:coverage:coverage-manager");

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
    log("Added data", JSON.stringify(data, null, 2));
  }

  public async saveData(): Promise<void> {
    const dataPath = await this.#getDataPath();
    const filePath = path.join(dataPath, `${crypto.randomUUID()}.json`);
    const data = this.#data;
    await writeJsonFile(filePath, data);
    log(`Saved data to ${filePath}`, JSON.stringify(data, null, 2));
  }

  public async loadData(): Promise<void> {
    const dataPath = await this.#getDataPath();
    const filePaths = await getAllFilesMatching(dataPath);
    const data = [];
    for (const filePath of filePaths) {
      const partialData = await readJsonFile<CoverageData>(filePath);
      data.push(...partialData);
      log(`Loaded data from ${filePath}`, JSON.stringify(partialData, null, 2));
    }
    this.#data = data;
    log("Loaded data", JSON.stringify(data, null, 2));
  }

  public async clearData(): Promise<void> {
    const dataPath = await this.#getDataPath();
    await remove(dataPath);
    await ensureDir(dataPath);
    this.#data = [];
    log("Cleared data");
  }

  // NOTE: This function is exposed for testing only
  public async getData(): Promise<CoverageData> {
    return this.#data;
  }

  public async addMetadata(metadata: CoverageMetadata): Promise<void> {
    // NOTE: The received metadata might contain duplicates. For now, we're OK
    // with this. Once we implement report generation, we should decide at which
    // stage we should deduplicate the metadata.
    this.#metadata.push(...metadata);
    log("Added metadata", JSON.stringify(metadata, null, 2));
  }

  // NOTE: This function is exposed for testing only
  public async getMetadata(): Promise<CoverageMetadata> {
    return this.#metadata;
  }
}

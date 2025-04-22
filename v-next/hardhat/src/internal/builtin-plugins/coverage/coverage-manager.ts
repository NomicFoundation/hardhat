import type {CoverageManager, CoverageHits} from "../../../types/coverage.js";

import { randomUUID } from "node:crypto";
import path from "node:path";

import {
  ensureDir,
  getAllFilesMatching,
  readJsonFile,
  remove,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";

import { getOrCreateInternalCoverageManager } from "./internal/coverage-manager.js";

export class CoverageManagerImplementation implements CoverageManager {
  readonly #coveragePath: string;

  #hitsPath?: string;

  constructor(coveragePath: string) {
    this.#coveragePath = coveragePath;
  }

  async #getHitsPath(): Promise<string> {
    if (this.#hitsPath === undefined) {
      this.#hitsPath = path.join(this.#coveragePath, "hits");
      await ensureDir(this.#hitsPath);
    }
    return this.#hitsPath;
  }

  public async saveProviderHits(): Promise<void> {
    const internal = await getOrCreateInternalCoverageManager();
    const hits = await internal.getProviderHits();
    const hitsPath = path.join(await this.#getHitsPath(), `${randomUUID()}.json`);
    await writeJsonFile(hitsPath, hits);

    // NOTE: After we dump the provider hits to disk, we remove them from the internal
    // coverage manager; this allows collecting coverage from succesive tasks
    await internal.clearProviderHits();
  }

  public async loadProviderHits(): Promise<CoverageHits> {
    const hitsPaths = await getAllFilesMatching(
      await this.#getHitsPath(),
      (filePath) => path.extname(filePath) === ".json",
    );
    const hits: CoverageHits = {};
    for (const hitsPath of hitsPaths) {
      const intermediateHits = await readJsonFile<CoverageHits>(hitsPath);
      for (const [k, v] of Object.entries(intermediateHits)) {
        hits[k] = (hits[k] ?? 0) + v;
      }
    }

    // NOTE: After we load all the provider hits from disk, we remove them from
    // the disk; this allows collecting coverage from succesive tasks
    await this.#clearProviderHits(hitsPaths);

    return hits;
  }

  async #clearProviderHits(hitsPaths: string[]): Promise<void> {
    for (const hitsPath of hitsPaths) {
      await remove(hitsPath);
    }
  }
}

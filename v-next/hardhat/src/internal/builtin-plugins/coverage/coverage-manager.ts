import type { CoverageHits } from "./internal/types.js";
import type { CoverageManager } from "../../../types/coverage.js";

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

  // NOTE: This function will remain unused until we attempt to create
  // a coverage report from hits and accompanying metadata
  async #getHits(): Promise<CoverageHits> {
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
    for (const hitsPath of hitsPaths) {
      await remove(hitsPath);
    }

    return hits;
  }

  public async save(): Promise<void> {
    const internal = await getOrCreateInternalCoverageManager();
    const hits = await internal.getProviderHits();
    const hitsPath = path.join(
      await this.#getHitsPath(),
      `${randomUUID()}.json`,
    );
    await writeJsonFile(hitsPath, hits);

    // NOTE: After we dump the provider hits to disk, we remove them from the internal
    // coverage manager; this allows collecting coverage from succesive tasks
    await internal.clearProviderHits();
  }
}

import type {
  CoverageHits,
  CoverageManager,
  CoverageMetadata,
} from "./types.js";
import type { EdrProvider } from "../network-manager/edr/edr-provider.js";

import { randomUUID } from "node:crypto";
import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import {
  ensureDir,
  getAllFilesMatching,
  readJsonFile,
  remove,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";

let coverageManager: CoverageManager | undefined;

export function getOrCreateCoverageManager(): CoverageManager {
  if (coverageManager === undefined) {
    coverageManager = new CoverageManagerImplementation();
  }
  return coverageManager;
}

export class CoverageManagerImplementation implements CoverageManager {
  readonly #providers: Record<string, EdrProvider> = {};
  readonly #hits: CoverageHits = {};
  readonly #metadata: CoverageMetadata = {};

  #coveragePath?: string;
  #hitsPath?: string;

  #getCoveragePath(): string {
    if (this.#coveragePath === undefined) {
      const coveragePath = process.env.HARDHAT_COVERAGE_PATH;
      assertHardhatInvariant(
        coveragePath !== undefined,
        "HARDHAT_COVERAGE_PATH was not set",
      );
      this.#coveragePath = coveragePath;
    }
    return this.#coveragePath;
  }

  async #getHitsPath(): Promise<string> {
    if (this.#hitsPath === undefined) {
      this.#hitsPath = path.join(this.#getCoveragePath(), "hits");
      await ensureDir(this.#hitsPath);
    }
    return this.#hitsPath;
  }

  public async save(): Promise<void> {
    // NOTE: Draining the providers first to ensure all the hits were collected
    await Promise.all(
      Object.keys(this.#providers).map((id) => this.removeProvider(id)),
    );
    const hitsPath = path.join(
      await this.#getHitsPath(),
      `${randomUUID()}.json`,
    );
    await writeJsonFile(hitsPath, this.#hits);

    // NOTE: After we dump the provider hits to disk, we remove them from the internal coverage manager
    // This ensures the same data is not written twice
    await Promise.all(
      Object.keys(this.#hits).map((id) => {
        delete this.#hits[id];
      }),
    );
  }

  // NOTE: This function will remain unused until we attempt to create
  // a coverage report from hits and accompanying metadata
  async #load(): Promise<void> {
    const hitsPaths = await getAllFilesMatching(
      await this.#getHitsPath(),
      (filePath) => path.extname(filePath) === ".json",
    );
    const _hits: CoverageHits = {};
    for (const hitsPath of hitsPaths) {
      const intermediateHits = await readJsonFile<CoverageHits>(hitsPath);
      for (const [k, v] of Object.entries(intermediateHits)) {
        _hits[k] = (_hits[k] ?? 0) + v;
      }
    }

    // NOTE: After we load all the provider hits from disk, we remove them from the disk
    // This ensures the same data is not read twice
    for (const hitsPath of hitsPaths) {
      await remove(hitsPath);
    }

    // TODO: Continue processing _hits to produce the report
  }

  public async addProvider(id: string, provider: EdrProvider): Promise<void> {
    this.#providers[id] = provider;
  }

  public async removeProvider(id: string): Promise<void> {
    const _provider = this.#providers[id];
    // TODO: Get the coverage data from the EDR provider before it is closed

    delete this.#providers[id];
  }

  public async updateMetadata(metadata: CoverageMetadata): Promise<void> {
    for (const markerId of Object.keys(metadata)) {
      this.#metadata[markerId] = metadata[markerId];
    }
  }
}

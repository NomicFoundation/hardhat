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
  writeUtf8File,
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

  async #getLcovInfo(): Promise<string> {
    // NOTE: Format follows the guidelines set out in:
    // https://github.com/linux-test-project/lcov/blob/df03ba434eee724bfc2b27716f794d0122951404/man/geninfo.1#L1409

    let lcov = "";

    // A tracefile is made up of several human-readable lines of text, divided
    // into sections.

    // If available, a tracefile begins with the testname which is stored in the
    // following format:
    // TN:<test name>
    lcov += "TN:\n";

    const sourceNames = new Set(
      this.#metadata.map(({ sourceName }) => sourceName),
    );

    for (const sourceName of sourceNames) {
      // For each source file referenced in the .gcda file, there is a section
      // containing filename and coverage data:
      // SF:<path to the source file>
      lcov += `SF:${sourceName}\n`;

      const statements = this.#metadata.filter(
        (m) => m.sourceName === sourceName,
      );
      const tags = new Set();

      // Function coverage data follows.
      // Note that the format of the function coverage data has changed from
      // LCOV 2.2 onward. The tool continues to be able to read the old format
      // but now writes only the new format. This change was made so that function
      // filter outcome is persistent in the generated tracefile.

      // Functions and their aliases are recorded contiguously:

      // First, the leader:
      // FNL:<index>,<line number of function start>[,line number of function end>]

      // Then the aliases of the function; there will be at least one alias.  All aliases of a particular function share the same index.
      // FNA:<index>,<execution count>,<name>

      // The now-obsolete function data format is:

      for (const statement of statements) {
        const { tag, startUtf16, endUtf16 } = statement;
        if (!tags.has(tag)) {
          tags.add(tag);
          // Function coverage data follows.
          // Note that the format of the function coverage data has changed from
          // LCOV 2.2 onward. The tool continues to be able to read the old
          // format but now writes only the new format. This change was made so
          // that function filter outcome is persistent in the generated tracefile.

          // Functions and their aliases are recorded contiguously:

          // First, the leader:
          // FNL:<index>,<line number of function start>[,line number of function end>]

          // Then the aliases of the function; there will be at least one alias.
          // All aliases of a particular function share the same index.
          // FNA:<index>,<execution count>,<name>

          // The now-obsolete function data format is:
          // FN:<line number of function start>,[<line number of function end>,]<function name>

          // NOTE: We implement the now-obsolete format because we care more about
          // backward compatibility than about the function filter support.
          lcov += `FN:${startUtf16},${endUtf16},${tag}\n`;
        }
      }

      const executedTags = this.#data.filter((tag) => tags.has(tag));
      const executionCounts = new Map<string, number>();
      for (const tag of executedTags) {
        const executionCount = executionCounts.get(tag) ?? 0;
        executionCounts.set(tag, executionCount + 1);
      }

      for (const tag of executedTags) {
        const executionCount = executionCounts.get(tag) ?? 0;
        // Next, there is a list of execution counts for each instrumented function:
        // FNDA:<execution count>,<function name>
        lcov += `FNDA:${executionCount},${tag}\n`;
      }

      // This list is followed by two lines containing the number of functions found
      // and hit:
      // FNF:<number of functions found>
      // FNH:<number of function hit>
      // Note that, as of LCOV 2.2, these numbers count function groups - not the individual aliases.
      lcov += `FNF:${tags.size}\n`;
      lcov += `FNH:${executionCounts.size}\n`;

      // Each sections ends with:
      // end_of_record
      lcov += "end_of_record\n";
    }

    return lcov;
  }

  public async saveLcovInfo(): Promise<void> {
    const lcovInfoPath = path.join(this.#coveragePath, "lcov.info");
    await writeUtf8File(lcovInfoPath, await this.#getLcovInfo());
  }
}

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

  // NOTE: This is a very inefficient implementation of the LCOV report generation.
  // It should and will be optimised with appropriate data preprocessing and data
  // structure usage.
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

    // For each source file referenced in the .gcda file, there is a section
    // containing filename and coverage data:
    // SF:<path to the source file>

    for (const sourceName of sourceNames) {
      lcov += `SF:${sourceName}\n`;

      // Then there is a list of execution counts for each instrumented line
      // (i.e. a line which resulted in executable code):
      // DA:<line number>,<execution count>[,<checksum>]

      // At the end of a section, there is a summary about how many lines
      // were found and how many were actually instrumented:
      // LH:<number of lines with a non\-zero execution count>
      // LF:<number of instrumented lines>

      const allStatements: CoverageMetadata = this.#metadata.filter(
        (m) => m.sourceName === sourceName,
      );

      const executedStatements: CoverageMetadata = [];
      for (const tag of this.#data) {
        const statement = allStatements.find((s) => s.tag === tag);
        if (statement !== undefined) {
          executedStatements.push(statement);
        }
      }

      const lineExecutionCounts = new Map<number, number>();
      for (const statement of executedStatements) {
        const { startLine, endLine } = statement;
        for (let line = startLine; line <= endLine; line++) {
          const count = lineExecutionCounts.get(line) ?? 0;
          lineExecutionCounts.set(line, count + 1);
        }
      }

      const executedLineCount = lineExecutionCounts.size;

      for (const statement of allStatements) {
        const executedStatement = executedStatements.find(
          (s) => s.tag === statement.tag,
        );
        if (executedStatement === undefined) {
          const { startLine, endLine } = statement;
          for (let line = startLine; line <= endLine; line++) {
            if (!lineExecutionCounts.has(line)) {
              lineExecutionCounts.set(line, 0);
            }
          }
        }
      }

      const totalLineCount = lineExecutionCounts.size;

      for (const [line, executionCount] of lineExecutionCounts) {
        lcov += `DA:${line},${executionCount}\n`;
      }
      lcov += `LH:${executedLineCount}\n`;
      lcov += `LF:${totalLineCount}\n`;

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

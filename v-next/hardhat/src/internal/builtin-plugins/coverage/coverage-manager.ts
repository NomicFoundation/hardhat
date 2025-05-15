import type {
  CoverageData,
  CoverageManager,
  CoverageMetadata,
  Statement,
  Tag,
} from "./types.js";

import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
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

interface Report {
  [sourceName: string]: {
    tagExecutionCounts: Map<Tag, number>;
    lineExecutionCounts: Map<number, number>;
    executedTags: Set<Tag>;
    unexecutedTags: Set<Tag>;
    executedLines: Set<number>;
    partiallyExecutedLines: Set<number>;
    unexecutedLines: Set<number>;
  };
}

export class CoverageManagerImplementation implements CoverageManager {
  // NOTE: These are exposed for testing only
  public metadata: CoverageMetadata = [];
  public data: CoverageData = [];

  readonly #coveragePath: string;

  #testRunDoneHandlerEnabled = true;
  #report: Report | undefined;

  constructor(coveragePath: string) {
    this.#coveragePath = coveragePath;
  }

  async #getDataPath(id: string): Promise<string> {
    const dataPath = path.join(this.#coveragePath, "data", id);
    await ensureDir(dataPath);
    return dataPath;
  }

  public async addData(data: CoverageData): Promise<void> {
    this.data.push(...data);
    log("Added data", JSON.stringify(data, null, 2));
  }

  public async addMetadata(metadata: CoverageMetadata): Promise<void> {
    // NOTE: The received metadata might contain duplicates. We deduplicate it
    // when we generate the report.
    this.metadata.push(...metadata);
    log("Added metadata", JSON.stringify(metadata, null, 2));
  }

  public async handleTestRunStart(id: string): Promise<void> {
    await this.#clearDataFromDisk(id);
    this.#clearDataFromMemory();
    log("Cleared data from disk and memory");
  }

  public async handleTestWorkerDone(id: string): Promise<void> {
    await this.#saveData(id);
    log("Saved data");
  }

  public async handleTestRunDone(...ids: string[]): Promise<void> {
    if (!this.#testRunDoneHandlerEnabled) {
      return;
    }

    this.#clearDataFromMemory();
    log("Cleared data from memory");

    for (const id of ids) {
      await this.#loadData(id);
      log("Loaded data");
    }

    const lcovReport = this.#getLcovReport();
    const markdownReport = this.#getMarkdownReport();

    const lcovReportPath = path.join(this.#coveragePath, "lcov.info");
    await writeUtf8File(lcovReportPath, lcovReport);
    log(`Saved lcov report to ${lcovReportPath}`);

    console.log(markdownReport);
    log("Printed markdown report");
  }

  public disableTestRunDoneHandler(): void {
    this.#testRunDoneHandlerEnabled = false;
  }

  public enableTestRunDoneHandler(): void {
    this.#testRunDoneHandlerEnabled = true;
  }

  async #saveData(id: string): Promise<void> {
    const dataPath = await this.#getDataPath(id);
    const filePath = path.join(dataPath, `${crypto.randomUUID()}.json`);
    const data = this.data;
    await writeJsonFile(filePath, data);
  }

  async #loadData(id: string): Promise<void> {
    const dataPath = await this.#getDataPath(id);
    const filePaths = await getAllFilesMatching(dataPath);
    const data = [];
    for (const filePath of filePaths) {
      const partialData = await readJsonFile<CoverageData>(filePath);
      data.push(...partialData);
    }
    this.data.push(...data);
  }

  async #clearDataFromDisk(id: string): Promise<void> {
    const dataPath = await this.#getDataPath(id);
    await remove(dataPath);
  }

  #clearDataFromMemory(): void {
    this.data = [];
  }

  #getReport(): Report {
    if (this.#report === undefined) {
      const report: Report = {};

      const sourceNames = this.metadata.map(({ sourceName }) => sourceName);

      const allStatements = this.metadata;

      // NOTE: We preserve only the last statement per tag in the statementsByTag map.
      const statementsByTag = new Map<string, Statement>();
      for (const statement of allStatements) {
        statementsByTag.set(statement.tag, statement);
      }

      const allExecutedTags = this.data;

      const allExecutedStatementsBySource = new Map<string, Statement[]>();
      for (const tag of allExecutedTags) {
        // NOTE: We should not encounter an executed tag we don't have metadata for.
        const statement = statementsByTag.get(tag);
        assertHardhatInvariant(statement !== undefined, "Expected a statement");

        const source = statement.sourceName;
        const allExecutedStatements =
          allExecutedStatementsBySource.get(source) ?? [];
        allExecutedStatements.push(statement);
        allExecutedStatementsBySource.set(source, allExecutedStatements);
      }

      const uniqueExecutedTags = new Set(allExecutedTags);
      const uniqueUnexecutedTags = Array.from(statementsByTag.keys()).filter(
        (tag) => !uniqueExecutedTags.has(tag),
      );

      const uniqueUnexecutedStatementsBySource = new Map<string, Statement[]>();
      for (const tag of uniqueUnexecutedTags) {
        // NOTE: We cannot encounter an executed tag we don't have metadata for.
        const statement = statementsByTag.get(tag);
        assertHardhatInvariant(statement !== undefined, "Expected a statement");

        const source = statement.sourceName;
        const unexecutedStatements =
          uniqueUnexecutedStatementsBySource.get(source) ?? [];
        unexecutedStatements.push(statement);
        uniqueUnexecutedStatementsBySource.set(source, unexecutedStatements);
      }

      for (const source of sourceNames) {
        const allExecutedStatements =
          allExecutedStatementsBySource.get(source) ?? [];
        const uniqueUnexecutedStatements =
          uniqueUnexecutedStatementsBySource.get(source) ?? [];

        const tagExecutionCounts = new Map<Tag, number>();
        const lineExecutionCounts = new Map<number, number>();

        for (const statement of allExecutedStatements) {
          const tagExecutionCount = tagExecutionCounts.get(statement.tag) ?? 0;
          tagExecutionCounts.set(statement.tag, tagExecutionCount + 1);

          for (
            let line = statement.startLine;
            line <= statement.endLine;
            line++
          ) {
            const lineExecutionCount = lineExecutionCounts.get(line) ?? 0;
            lineExecutionCounts.set(line, lineExecutionCount + 1);
          }
        }

        const executedTags = new Set<Tag>(tagExecutionCounts.keys());
        const unexecutedTags = new Set<Tag>();

        const executedLines = new Set<number>(lineExecutionCounts.keys());
        const partiallyExecutedLines = new Set<number>();
        const unexecutedLines = new Set<number>();

        for (const statement of uniqueUnexecutedStatements) {
          if (!tagExecutionCounts.has(statement.tag)) {
            tagExecutionCounts.set(statement.tag, 0);
            unexecutedTags.add(statement.tag);
          }

          for (
            let line = statement.startLine;
            line <= statement.endLine;
            line++
          ) {
            if (!lineExecutionCounts.has(line)) {
              lineExecutionCounts.set(line, 0);
              unexecutedLines.add(line);
            } else {
              partiallyExecutedLines.add(line);
            }
          }
        }

        report[source] = {
          tagExecutionCounts,
          lineExecutionCounts,
          executedTags,
          unexecutedTags,
          executedLines,
          partiallyExecutedLines,
          unexecutedLines,
        };
      }

      this.#report = report;
    }

    return this.#report;
  }

  #getLcovReport(): string {
    const report = this.#getReport();

    // NOTE: Format follows the guidelines set out in:
    // https://github.com/linux-test-project/lcov/blob/df03ba434eee724bfc2b27716f794d0122951404/man/geninfo.1#L1409

    let lcov = "";

    // A tracefile is made up of several human-readable lines of text, divided
    // into sections.

    // If available, a tracefile begins with the testname which is stored in the
    // following format:
    // TN:<test name>
    lcov += "TN:\n";

    // For each source file referenced in the .gcda file, there is a section
    // containing filename and coverage data:
    // SF:<path to the source file>

    for (const [
      source,
      { lineExecutionCounts, executedLines },
    ] of Object.entries(report)) {
      lcov += `SF:${source}\n`;

      // Then there is a list of execution counts for each instrumented line
      // (i.e. a line which resulted in executable code):
      // DA:<line number>,<execution count>[,<checksum>]

      // At the end of a section, there is a summary about how many lines
      // were found and how many were actually instrumented:
      // LH:<number of lines with a non\-zero execution count>
      // LF:<number of instrumented lines>

      for (const [line, executionCount] of lineExecutionCounts) {
        lcov += `DA:${line},${executionCount}\n`;
      }
      lcov += `LH:${executedLines.size}\n`;
      lcov += `LF:${lineExecutionCounts.size}\n`;

      // Each sections ends with:
      // end_of_record
      lcov += "end_of_record\n";
    }

    return lcov;
  }

  #getMarkdownReport(): string {
    const report = this.#getReport();

    let totalExecutedLines = 0;
    let totalExecutableLines = 0;

    let totalExecutedStatements = 0;
    let totalExecutableStatements = 0;

    const headerRow = [
      "Source Name 📦",
      "Line % 📈",
      "Statement % 📈",
      "Uncovered Lines 🔍",
      "Partially Covered Lines 🔍",
    ];

    const rows = Object.entries(report).map(
      ([
        source,
        {
          tagExecutionCounts,
          lineExecutionCounts,
          executedTags,
          executedLines,
          unexecutedLines,
          partiallyExecutedLines,
        },
      ]) => {
        const lineCoverage =
          lineExecutionCounts.size === 0
            ? 0
            : (executedLines.size * 100.0) / lineExecutionCounts.size;
        const statementCoverage =
          tagExecutionCounts.size === 0
            ? 0
            : (executedTags.size * 100.0) / tagExecutionCounts.size;

        totalExecutedLines += executedLines.size;
        totalExecutableLines += lineExecutionCounts.size;

        totalExecutedStatements += executedTags.size;
        totalExecutableStatements += tagExecutionCounts.size;

        const uncoveredLines =
          unexecutedLines.size === 0
            ? "-"
            : Array.from(unexecutedLines)
                .toSorted((a, b) => a - b)
                .join(", ");
        const partiallyCoveredLines =
          partiallyExecutedLines.size === 0
            ? "-"
            : Array.from(partiallyExecutedLines)
                .toSorted((a, b) => a - b)
                .join(", ");

        const row: string[] = [
          source,
          lineCoverage.toFixed(2).toString(),
          statementCoverage.toFixed(2).toString(),
          uncoveredLines,
          partiallyCoveredLines,
        ];

        return row;
      },
    );

    const totalLineCoverage =
      totalExecutableLines === 0
        ? 0
        : (totalExecutedLines * 100.0) / totalExecutableLines;
    const totalStatementCoverage =
      totalExecutableStatements === 0
        ? 0
        : (totalExecutedStatements * 100.0) / totalExecutableStatements;

    const footerRow = [
      "Total",
      totalLineCoverage.toFixed(2).toString(),
      totalStatementCoverage.toFixed(2).toString(),
      "",
      "",
    ];

    const widths = headerRow.map((header) => header.length);

    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        widths[i] = Math.max(widths[i], row[i].length);
      }
    }

    for (let i = 0; i < footerRow.length; i++) {
      widths[i] = Math.max(widths[i], footerRow[i].length);
    }

    const dividerRow = widths.map((width) => "-".repeat(width));

    rows.unshift(dividerRow);
    rows.unshift(headerRow);

    rows.push(dividerRow);
    rows.push(footerRow);

    rows.forEach((row) => {
      for (let i = 0; i < row.length; i++) {
        row[i] = row[i].padEnd(widths[i]);
      }
    });

    return rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  }
}

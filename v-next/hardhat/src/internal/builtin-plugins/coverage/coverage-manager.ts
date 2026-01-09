import type {
  CoverageData,
  CoverageManager,
  CoverageMetadata,
  Statement,
} from "./types.js";
import type { TableItem } from "@nomicfoundation/hardhat-utils/format";

import path from "node:path";

import { divider, formatTable } from "@nomicfoundation/hardhat-utils/format";
import {
  ensureDir,
  getAllFilesMatching,
  readJsonFile,
  readUtf8File,
  remove,
  writeJsonFile,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";
import debug from "debug";

import { getProcessedCoverageInfo } from "./process-coverage.js";

const log = debug("hardhat:core:coverage:coverage-manager");

const MAX_COLUMN_WIDTH = 80;

type Line = number;

/**
 * @private exposed for testing purposes only
 */
export interface FileReport {
  // NOTE: currently, the counters for how many times a statement is executed are not implemented in EDR,
  // so the only information available is whether a statement was executed, not how many times it was executed.
  // Also, branch coverage is not available.
  // In addition, partially executed lines (for example, ternary operators) cannot be determined, as this information is missing in EDR,
  // since only whole statements can be registered as executed or not.

  lineExecutionCounts: Map<Line, number>;

  executedStatementsCount: number;
  unexecutedStatementsCount: number;

  executedLinesCount: number;

  unexecutedLines: Set<Line>;
}

export interface Report {
  [relativePath: string]: FileReport;
}

type FilesMetadata = Map<
  string, // relative path
  Map<
    string, // composite key
    Statement
  >
>;

export class CoverageManagerImplementation implements CoverageManager {
  /**
   * @private exposed for testing purposes only
   */
  public filesMetadata: FilesMetadata = new Map<
    string,
    Map<string, Statement>
  >();

  /**
   * @private exposed for testing purposes only
   */
  public data: CoverageData = [];

  readonly #coveragePath: string;

  #reportEnabled = true;

  constructor(coveragePath: string) {
    this.#coveragePath = coveragePath;
  }

  async #getDataPath(id: string): Promise<string> {
    const dataPath = path.join(this.#coveragePath, "data", id);
    await ensureDir(dataPath);
    return dataPath;
  }

  public async addData(data: CoverageData): Promise<void> {
    for (const entry of data) {
      this.data.push(entry);
    }

    log("Added data", JSON.stringify(data, null, 2));
  }

  public async addMetadata(metadata: CoverageMetadata): Promise<void> {
    for (const entry of metadata) {
      log("Added metadata", JSON.stringify(metadata, null, 2));

      let fileStatements = this.filesMetadata.get(entry.relativePath);

      if (fileStatements === undefined) {
        fileStatements = new Map();
        this.filesMetadata.set(entry.relativePath, fileStatements);
      }

      const key = `${entry.relativePath}-${entry.tag}-${entry.startUtf16}-${entry.endUtf16}`;

      const existingData = fileStatements.get(key);

      if (existingData === undefined) {
        fileStatements.set(key, entry);
      }
    }
  }

  public async clearData(id: string): Promise<void> {
    const dataPath = await this.#getDataPath(id);
    await remove(dataPath);
    this.data = [];
    log("Cleared data from disk and memory");
  }

  public async saveData(id: string): Promise<void> {
    const dataPath = await this.#getDataPath(id);
    const filePath = path.join(dataPath, `${crypto.randomUUID()}.json`);
    const data = this.data;
    await writeJsonFile(filePath, data);
    log("Saved data", id, filePath);
  }

  public async report(...ids: string[]): Promise<void> {
    if (!this.#reportEnabled) {
      return;
    }

    await this.loadData(...ids);

    const report = await this.getReport();
    const lcovReport = this.formatLcovReport(report);
    const markdownReport = this.formatMarkdownReport(report);

    const lcovReportPath = path.join(this.#coveragePath, "lcov.info");
    await writeUtf8File(lcovReportPath, lcovReport);
    log(`Saved lcov report to ${lcovReportPath}`);

    console.log(markdownReport);
    console.log();
    log("Printed markdown report");
  }

  public enableReport(): void {
    this.#reportEnabled = true;
  }

  public disableReport(): void {
    this.#reportEnabled = false;
  }

  /**
   * @private exposed for testing purposes only
   */
  public async loadData(...ids: string[]): Promise<void> {
    this.data = [];
    for (const id of ids) {
      const dataPath = await this.#getDataPath(id);
      const filePaths = await getAllFilesMatching(dataPath);
      for (const filePath of filePaths) {
        const entries = await readJsonFile<CoverageData>(filePath);
        for (const entry of entries) {
          this.data.push(entry);
        }
        log("Loaded data", id, filePath);
      }
    }
  }

  /**
   * @private exposed for testing purposes only
   */
  public async getReport(): Promise<Report> {
    const allExecutedTags = new Set(this.data);

    const reportPromises = Array.from(this.filesMetadata.entries()).map(
      async ([fileRelativePath, fileStatements]) => {
        const statements = Array.from(fileStatements.values());

        const fileContent = await readUtf8File(
          path.join(process.cwd(), fileRelativePath),
        );

        const tags: Set<string> = new Set();
        let executedStatementsCount = 0;
        let unexecutedStatementsCount = 0;

        for (const { tag } of statements) {
          if (allExecutedTags.has(tag)) {
            tags.add(tag);
            executedStatementsCount++;
          } else {
            unexecutedStatementsCount++;
          }
        }

        const coverageInfo = getProcessedCoverageInfo(
          fileContent,
          statements,
          tags,
        );

        const lineExecutionCounts = new Map<number, number>();
        coverageInfo.lines.executed.forEach((_, line) =>
          lineExecutionCounts.set(line, 1),
        );
        coverageInfo.lines.notExecuted.forEach((_, line) =>
          lineExecutionCounts.set(line, 0),
        );

        const executedLinesCount = coverageInfo.lines.executed.size;
        const unexecutedLines = new Set(coverageInfo.lines.notExecuted.keys());

        return {
          path: fileRelativePath,
          data: {
            lineExecutionCounts,
            executedStatementsCount,
            unexecutedStatementsCount,
            executedLinesCount,
            unexecutedLines,
          },
        };
      },
    );

    const results = await Promise.all(reportPromises);

    return Object.fromEntries(results.map((r) => [r.path, r.data]));
  }

  /**
   * @private exposed for testing purposes only
   */
  public formatLcovReport(report: Report): string {
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
      relativePath,
      { lineExecutionCounts, executedLinesCount },
    ] of Object.entries(report)) {
      lcov += `SF:${relativePath}\n`;

      // NOTE: We report statement coverage as branches to get partial line coverage
      // data in tools parsing the lcov files. This is because the lcov format
      // does not support statement coverage.
      // WARN: This feature is highly experimental and should not be relied upon.

      // Branch coverage information is stored one line per branch:
      // BRDA:<line_number>,[<exception>]<block>,<branch>,<taken>

      // Branch coverage summaries are stored in two lines:
      // BRF:<number of branches found>
      // BRH:<number of branches hit>

      // TODO: currently EDR does not provide branch coverage information.
      // for (const [[line, tag], executionCount] of branchExecutionCounts) {
      //   lcov += `BRDA:${line},0,${tag},${executionCount === 0 ? "-" : executionCount}\n`;
      // }
      // lcov += `BRH:${executedBranchesCount}\n`;
      // lcov += `BRF:${branchExecutionCounts.size}\n`;

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
      lcov += `LH:${executedLinesCount}\n`;
      lcov += `LF:${lineExecutionCounts.size}\n`;

      // Each sections ends with:
      // end_of_record
      lcov += "end_of_record\n";
    }

    return lcov;
  }

  /**
   * @private exposed for testing purposes only
   */
  public formatRelativePath(relativePath: string): string {
    if (relativePath.length <= MAX_COLUMN_WIDTH) {
      return relativePath;
    }

    const prefix = "…";

    const pathParts = relativePath.split(path.sep);

    const parts = [pathParts[pathParts.length - 1]];
    let partsLength = parts[0].length;

    for (let i = pathParts.length - 2; i >= 0; i--) {
      const part = pathParts[i];
      if (
        partsLength +
          part.length +
          prefix.length +
          (parts.length + 1) * path.sep.length <=
        MAX_COLUMN_WIDTH
      ) {
        parts.push(part);
        partsLength += part.length;
      } else {
        break;
      }
    }

    parts.push(prefix);

    return parts.reverse().join(path.sep);
  }

  /**
   * @private exposed for testing purposes only
   */
  public formatCoverage(coverage: number): string {
    return coverage.toFixed(2).toString();
  }

  /**
   * @private exposed for testing purposes only
   */
  public formatLines(lines: Set<number>): string {
    if (lines.size === 0) {
      return "-";
    }

    const sortedLines = Array.from(lines).toSorted((a, b) => a - b);

    const intervals = [];
    let intervalsLength = 0;

    let startLine = sortedLines[0];
    let endLine = sortedLines[0];
    for (let i = 1; i <= sortedLines.length; i++) {
      if (i < sortedLines.length && sortedLines[i] === endLine + 1) {
        endLine = sortedLines[i];
      } else {
        let interval: string;
        if (startLine === endLine) {
          interval = startLine.toString();
        } else {
          interval = `${startLine}-${endLine}`;
        }
        intervals.push(interval);
        intervalsLength += interval.length;
        if (i < sortedLines.length) {
          startLine = sortedLines[i];
          endLine = sortedLines[i];
        }
      }
    }

    const sep = ", ";
    const suffixSep = ",";
    const suffix = "…";

    if (
      intervalsLength + (intervals.length - 1) * sep.length <=
      MAX_COLUMN_WIDTH
    ) {
      return intervals.join(sep);
    }

    while (
      intervalsLength +
        (intervals.length - 1) * sep.length +
        suffix.length +
        suffixSep.length >
      MAX_COLUMN_WIDTH
    ) {
      const interval = intervals.pop();
      if (interval !== undefined) {
        intervalsLength -= interval.length;
      } else {
        break;
      }
    }

    return [intervals.join(sep), suffix].join(suffixSep);
  }

  /**
   * @private exposed for testing purposes only
   */
  public formatMarkdownReport(report: Report): string {
    let totalExecutedLines = 0;
    let totalExecutableLines = 0;

    let totalExecutedStatements = 0;
    let totalExecutableStatements = 0;

    const rows: TableItem[] = [];

    rows.push([chalk.bold("Coverage Report")]);
    rows.push(divider);

    rows.push(
      ["File Path", "Line %", "Statement %", "Uncovered Lines"].map((s) =>
        chalk.yellow(s),
      ),
    );

    const bodyRows = Object.entries(report).map(
      ([
        relativePath,
        {
          executedStatementsCount,
          unexecutedStatementsCount,
          lineExecutionCounts,
          executedLinesCount,
          unexecutedLines,
        },
      ]) => {
        const lineCoverage =
          lineExecutionCounts.size === 0
            ? 0
            : (executedLinesCount * 100.0) / lineExecutionCounts.size;
        const statementCoverage =
          executedStatementsCount === 0
            ? 0
            : (executedStatementsCount * 100.0) /
              (executedStatementsCount + unexecutedStatementsCount);

        totalExecutedLines += executedLinesCount;
        totalExecutableLines += lineExecutionCounts.size;

        totalExecutedStatements += executedStatementsCount;
        totalExecutableStatements +=
          executedStatementsCount + unexecutedStatementsCount;

        const row: string[] = [
          this.formatRelativePath(relativePath),
          this.formatCoverage(lineCoverage),
          this.formatCoverage(statementCoverage),
          this.formatLines(unexecutedLines),
        ];

        return row;
      },
    );

    rows.push(...bodyRows);

    const totalLineCoverage =
      totalExecutableLines === 0
        ? 0
        : (totalExecutedLines * 100.0) / totalExecutableLines;
    const totalStatementCoverage =
      totalExecutableStatements === 0
        ? 0
        : (totalExecutedStatements * 100.0) / totalExecutableStatements;

    rows.push(divider);
    rows.push([
      chalk.yellow("Total"),
      this.formatCoverage(totalLineCoverage),
      this.formatCoverage(totalStatementCoverage),
      "",
    ]);

    return formatTable(rows);
  }
}

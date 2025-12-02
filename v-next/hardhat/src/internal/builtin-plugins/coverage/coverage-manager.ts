import type {
  CoverageData,
  CoverageManager,
  CoverageMetadata,
  Tag,
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
// type Branch = [Line, Tag];

interface Range {
  startIndex: number;
  endIndex: number;
}

export function extractCoveredRanges(
  markedFile: Array<{ char: string; covered: boolean | null }>,
): Range[] {
  const ranges: Range[] = [];
  const n = markedFile.length;

  let start = -1;

  for (let i = 0; i < n; i++) {
    if (markedFile[i].covered === true) {
      if (start === -1) {
        start = i; // begin new range
      }
    } else {
      if (start !== -1) {
        ranges.push({ startIndex: start, endIndex: i - 1 });
        start = -1;
      }
    }
  }

  // close last range if file ends inside a run
  if (start !== -1) {
    ranges.push({ startIndex: start, endIndex: n - 1 });
  }

  return ranges;
}

/**
 * @private exposed for testing purposes only
 */
export interface Report {
  [relativePath: string]: {
    // NOTE: currently the counters for the statements are not implemented in EDR,
    // so the only information we have is whether a statement was executed or not, not how many times it was executed.
    // Also, branch coverage is not available.
    // In addition, partially executed lines cannot be determined, as this information is missing in EDR,
    // since only whole lines can be registered as executed or not.

    tagExecutionCounts: Map<Tag, number>;
    lineExecutionCounts: Map<Line, number>;

    // branchExecutionCounts: Map<Branch, number>;

    executedTagsCount: number;
    executedLinesCount: number;
    // executedBranchesCount: number;

    // partiallyExecutedLines: Set<Line>;
    unexecutedLines: Set<Line>;
  };
}

export class CoverageManagerImplementation implements CoverageManager {
  /**
   * @private exposed for testing purposes only
   */
  public metadata: CoverageMetadata = [];
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

    //    console.log(JSON.stringify(data, null, 2));

    log("Added data", JSON.stringify(data, null, 2));
    // console.log("\n\nAdded data", JSON.stringify(data, null, 2));
  }

  public async addMetadata(metadata: CoverageMetadata): Promise<void> {
    // NOTE: The received metadata might contain duplicates. We deduplicate it
    // when we generate the report.
    for (const entry of metadata) {
      this.metadata.push(entry);
    }

    log("Added metadata", JSON.stringify(metadata, null, 2));
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
    const report: Report = {};

    const allExecutedTags = new Set(this.data);

    const fileRelativePaths = new Set(
      this.metadata.map(({ relativePath }) => relativePath),
    );

    // Calculate the coverage for each file individually
    for (const fileRelativePath of fileRelativePaths) {
      const statmentsForFile = this.metadata.filter(
        (m) => m.relativePath === fileRelativePath,
      );

      const tagsForFile = statmentsForFile.map((s) => s.tag);

      const executedTagsForFile = tagsForFile.filter((t) =>
        allExecutedTags.has(t),
      );

      const fileContent = await readUtf8File(
        path.join(process.cwd(), fileRelativePath),
      );

      const coverageInfo = getProcessedCoverageInfo(
        fileContent,
        statmentsForFile,
        executedTagsForFile,
      );

      const tagExecutionCounts = new Map<string, number>();
      for (const s of tagsForFile) {
        tagExecutionCounts.set(s, (tagExecutionCounts.get(s) ?? 0) + 1);
      }

      const executedTagsCount = new Set(executedTagsForFile).size;

      // Create a map that tracks how many times each line was executed.
      // Map: line number -> execution count
      // Currently, from EDR we only know whether a line was executed or not,
      // so the execution count is either 0 or 1.
      const lineExecutionCounts = new Map<number, number>([
        ...[...coverageInfo.lines.executed.keys()].map((k) => [k, 1] as const),
        ...[...coverageInfo.lines.notExecuted.keys()].map(
          (k) => [k, 0] as const,
        ),
      ]);

      const executedLinesCount = coverageInfo.lines.executed.size;

      const unexecutedLines = new Set([
        ...coverageInfo.lines.notExecuted.keys(),
      ]);

      // ----------------------------------------------------------------------------------------------
      // ---------------------- TO REMOVE AFTER TESTING
      // console.log("All executed tags:");
      // console.log(allExecutedTags);

      // console.log("");

      // console.log(JSON.stringify(this.metadata, null, 2));

      const fileToPrint: Array<{
        char: string;
        covered: null | boolean;
      }> = Array.from(fileContent).map((s) => ({
        char: s,
        covered: null,
      }));

      for (const s of coverageInfo.statments.executed) {
        for (let i = s.startUtf16; i <= s.endUtf16; i++) {
          fileToPrint[i].covered = true;
        }
      }
      for (const s of coverageInfo.statments.notExecuted) {
        for (let i = s.startUtf16; i <= s.endUtf16; i++) {
          fileToPrint[i].covered = false;
        }
      }

      // console.log(
      //   "----------------------------- REAL ONE START " + fileRelativePath,
      // );
      // console.log(lineExecutionCounts);
      // console.log(coverageInfo.lines.executed);
      // console.log("--------------");
      // for (const c of fileToPrint) {
      //   if (c.covered === true) {
      //     process.stdout.write(chalk.green(c.char));
      //   } else if (c.covered === false) {
      //     process.stdout.write(chalk.red(c.char));
      //   } else {
      //     process.stdout.write(c.char);
      //   }
      // }

      console.log(coverageInfo.lines.executed);
      console.log(coverageInfo.lines.notExecuted);
      console.log("----------------------------- REAL ONE END");

      // for (const m of this.metadata) {
      //   console.log(
      //     fileToPrint
      //       .slice(m.startUtf16, m.endUtf16)
      //       .map((c) => c.char)
      //       .join(""),
      //   );
      //   console.log(`Tag: ${m.tag}`);
      //   console.log("---");
      // }

      // console.log(allExecutedTags);

      // const indexes = [
      //   ...this.metadata.map((m) => m.startUtf16),
      //   ...this.metadata.map((m) => m.endUtf16),
      // ];

      // console.log(indexes);
      // let ik = 0;
      // for (const c of fileToPrint) {
      //   if (indexes.includes(ik + 1)) {
      //     process.stdout.write(chalk.green(c.char));
      //   } else {
      //     process.stdout.write(c.char);
      //   }

      //   ik++;
      // }

      // for (const i of this.metadata) {
      //   console.log(
      //     fileToPrint
      //       .slice(i.startUtf16, i.endUtf16)
      //       .map((c) => c.char)
      //       .join(""),
      //   );
      //   console.log(`Tag: ${i.tag}`);
      //   console.log("---");
      // }

      // ----------------------
      // ------------------------------------------------------------------------------------------------------------

      report[fileRelativePath] = {
        tagExecutionCounts,
        lineExecutionCounts,

        executedTagsCount,
        executedLinesCount,

        unexecutedLines,
      };
    }

    return report;
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
      {
        // branchExecutionCounts,
        // executedBranchesCount,
        lineExecutionCounts,
        executedLinesCount,
      },
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
      [
        "File Path",
        "Line %",
        "Statement %",
        "Uncovered Lines",
        "Partially Covered Lines",
      ].map((s) => chalk.yellow(s)),
    );

    const bodyRows = Object.entries(report).map(
      ([
        relativePath,
        {
          tagExecutionCounts,
          lineExecutionCounts,
          executedTagsCount,
          executedLinesCount,
          unexecutedLines,
        },
      ]) => {
        const lineCoverage =
          lineExecutionCounts.size === 0
            ? 0
            : (executedLinesCount * 100.0) / lineExecutionCounts.size;

        const statementCoverage =
          tagExecutionCounts.size === 0
            ? 0
            : (executedTagsCount * 100.0) / tagExecutionCounts.size;

        totalExecutedLines += executedLinesCount;
        totalExecutableLines += lineExecutionCounts.size;

        totalExecutedStatements += executedTagsCount;
        totalExecutableStatements += tagExecutionCounts.size;

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
      "",
    ]);

    return formatTable(rows);
  }
}

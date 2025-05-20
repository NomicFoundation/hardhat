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

const MAX_COLUMN_WIDTH = 80;

type Line = number;
type Branch = [Line, Tag];

interface Report {
  [sourceName: string]: {
    tagExecutionCounts: Map<Tag, number>;
    lineExecutionCounts: Map<Line, number>;
    branchExecutionCounts: Map<Branch, number>;

    executedTagsCount: number;
    executedLinesCount: number;
    executedBranchesCount: number;

    partiallyExecutedLines: Set<Line>;
    unexecutedLines: Set<Line>;
  };
}

export class CoverageManagerImplementation implements CoverageManager {
  // NOTE: These are exposed for testing only
  public metadata: CoverageMetadata = [];
  public data: CoverageData = [];

  readonly #coveragePath: string;

  #reportEnabled = true;
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
    log("Saved data");
  }

  public async report(...ids: string[]): Promise<void> {
    if (!this.#reportEnabled) {
      return;
    }

    await this.loadData(...ids);

    const lcovReport = this.#getLcovReport();
    const markdownReport = this.#getMarkdownReport();

    const lcovReportPath = path.join(this.#coveragePath, "lcov.info");
    await writeUtf8File(lcovReportPath, lcovReport);
    log(`Saved lcov report to ${lcovReportPath}`);

    console.log(markdownReport);
    log("Printed markdown report");
  }

  public enableReport(): void {
    this.#reportEnabled = true;
  }

  public disableReport(): void {
    this.#reportEnabled = false;
  }

  // NOTE: This is exposed for testing only
  public async loadData(...ids: string[]): Promise<void> {
    this.data = [];
    for (const id of ids) {
      const dataPath = await this.#getDataPath(id);
      const filePaths = await getAllFilesMatching(dataPath);
      const data = [];
      for (const filePath of filePaths) {
        const partialData = await readJsonFile<CoverageData>(filePath);
        data.push(...partialData);
      }
      this.data.push(...data);
    }
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

        for (const statement of allExecutedStatements) {
          const tagExecutionCount = tagExecutionCounts.get(statement.tag) ?? 0;
          tagExecutionCounts.set(statement.tag, tagExecutionCount + 1);
        }

        const lineExecutionCounts = new Map<number, number>();
        const branchExecutionCounts = new Map<Branch, number>();

        for (const [tag, executionCount] of tagExecutionCounts) {
          const statement = statementsByTag.get(tag);
          assertHardhatInvariant(
            statement !== undefined,
            "Expected a statement",
          );

          for (
            let line = statement.startLine;
            line <= statement.endLine;
            line++
          ) {
            const lineExecutionCount = lineExecutionCounts.get(line) ?? 0;
            lineExecutionCounts.set(line, lineExecutionCount + executionCount);

            const branchExecutionCount =
              branchExecutionCounts.get([line, tag]) ?? 0;
            branchExecutionCounts.set(
              [line, tag],
              branchExecutionCount + executionCount,
            );
          }
        }

        const executedTagsCount = tagExecutionCounts.size;
        const executedLinesCount = lineExecutionCounts.size;
        const executedBranchesCount = branchExecutionCounts.size;

        const partiallyExecutedLines = new Set<number>();
        const unexecutedLines = new Set<number>();

        for (const statement of uniqueUnexecutedStatements) {
          if (!tagExecutionCounts.has(statement.tag)) {
            tagExecutionCounts.set(statement.tag, 0);
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

            if (!branchExecutionCounts.has([line, statement.tag])) {
              branchExecutionCounts.set([line, statement.tag], 0);
            }
          }
        }

        report[source] = {
          tagExecutionCounts,
          lineExecutionCounts,
          branchExecutionCounts,

          executedTagsCount,
          executedLinesCount,
          executedBranchesCount,

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
      {
        branchExecutionCounts,
        executedBranchesCount,
        lineExecutionCounts,
        executedLinesCount,
      },
    ] of Object.entries(report)) {
      lcov += `SF:${source}\n`;

      // NOTE: We report statement coverage as branches to get partial line coverage
      // data in tools parsing the lcov files. This is because the lcov format
      // does not support statement coverage.
      // WARN: This feature is highly experimental and should not be relied upon.

      // Branch coverage information is stored one line per branch:
      // BRDA:<line_number>,[<exception>]<block>,<branch>,<taken>

      // Branch coverage summaries are stored in two lines:
      // BRF:<number of branches found>
      // BRH:<number of branches hit>

      for (const [[line, tag], executionCount] of branchExecutionCounts) {
        lcov += `BRDA:${line},0,${tag},${executionCount === 0 ? "-" : executionCount}\n`;
      }
      lcov += `BRH:${executedBranchesCount}\n`;
      lcov += `BRF:${branchExecutionCounts.size}\n`;

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

  #formatSource(source: string): string {
    if (source.length <= MAX_COLUMN_WIDTH) {
      return source;
    }

    const prefix = "…";

    const sourceParts = source.split(path.sep);

    const parts = [sourceParts[sourceParts.length - 1]];
    let partsLength = parts[0].length;

    for (let i = sourceParts.length - 2; i >= 0; i--) {
      const part = sourceParts[i];
      if (
        partsLength +
          part.length +
          prefix.length +
          (parts.length + 2) * path.sep.length <=
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

  #formatCoverage(coverage: number): string {
    return coverage.toFixed(2).toString();
  }

  #formatLines(lines: Set<number>): string {
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

    if (intervalsLength + intervals.length * sep.length <= MAX_COLUMN_WIDTH) {
      return intervals.join(sep);
    }

    while (
      intervalsLength +
        intervals.length * sep.length +
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
          executedTagsCount,
          executedLinesCount,
          unexecutedLines,
          partiallyExecutedLines,
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
          this.#formatSource(source),
          this.#formatCoverage(lineCoverage),
          this.#formatCoverage(statementCoverage),
          this.#formatLines(unexecutedLines),
          this.#formatLines(partiallyExecutedLines),
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

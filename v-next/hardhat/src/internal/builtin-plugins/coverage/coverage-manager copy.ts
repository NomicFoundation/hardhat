// /* eslint-disable @typescript-eslint/no-non-null-assertion -- TODO */
// import type {
//   CoverageData,
//   CoverageManager,
//   CoverageMetadata,
//   Statement,
//   Tag,
// } from "./types.js";
// import type { TableItem } from "@nomicfoundation/hardhat-utils/format";

// import {
//   //  createReadStream,
//   readFileSync,
// } from "node:fs";
// import path from "node:path";
// // import * as readline from "node:readline/promises";

// import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
// import { divider, formatTable } from "@nomicfoundation/hardhat-utils/format";
// import {
//   ensureDir,
//   getAllFilesMatching,
//   readJsonFile,
//   remove,
//   writeJsonFile,
//   writeUtf8File,
// } from "@nomicfoundation/hardhat-utils/fs";
// import chalk from "chalk";
// import debug from "debug";

// const log = debug("hardhat:core:coverage:coverage-manager");

// const MAX_COLUMN_WIDTH = 80;

// type Line = number;
// type Branch = [Line, Tag];

// interface NodeCoverage {
//   relativePath: string;
//   tag: string;
//   startUtf16: number;
//   endUtf16: number;
// }

// interface Interval {
//   startUtf16: number;
//   endUtf16: number;
//   executed: boolean;
// }

// interface ExecutedInterval {
//   startUtf16: number;
//   endUtf16: number;
// }

// /**
//  * Normalize raw intervals:
//  * - Deduplicate by (startUtf16, endUtf16).
//  * - If duplicates exist with different `executed` values,
//  *   we consider the interval executed if *any* duplicate is executed.
//  * - Sort so that:
//  *   - Smaller `startUtf16` comes first.
//  *   - For same `startUtf16`, larger `endUtf16` (outer parent) comes first.
//  */
// function normalizeIntervals(intervals: Interval[]): Interval[] {
//   const map = new Map<string, Interval>();

//   for (const it of intervals) {
//     const key = `${it.startUtf16}:${it.endUtf16}`;
//     const existing = map.get(key);
//     if (existing === undefined) {
//       map.set(key, { ...it });
//     } else {
//       // If any duplicate is executed, we mark the normalized interval as executed
//       existing.executed = existing.executed || it.executed;
//     }
//   }

//   const unique = Array.from(map.values());

//   unique.sort((a, b) => {
//     if (a.startUtf16 !== b.startUtf16) {
//       return a.startUtf16 - b.startUtf16;
//     }
//     // Same start: parent (larger end) first
//     return b.endUtf16 - a.endUtf16;
//   });

//   return unique;
// }

// /**
//  * Collapses executed intervals according to the rules:
//  *
//  * - Return only executed intervals.
//  * - If an interval contains sub-intervals and **all** of them (recursively)
//  *   are executed, return only the largest interval.
//  * - If an interval contains partially executed children,
//  *   return only the executed sub-intervals.
//  *
//  * It *first* normalizes the input to:
//  * - deduplicate intervals
//  * - sort them so that parents come before children
//  *
//  * Assumptions (after normalization):
//  * - Intervals either do not overlap or are in full containment.
//  */
// export function collapseExecutedIntervals(
//   rawIntervals: Interval[],
// ): ExecutedInterval[] {
//   const intervals = normalizeIntervals(rawIntervals);

//   interface Node {
//     startUtf16: number;
//     endUtf16: number;
//     executed: boolean;

//     hasChildren: boolean;
//     allDescendantsExecuted: boolean;
//     anyExecuted: boolean;
//     results: ExecutedInterval[];
//   }

//   const stack: Node[] = [];
//   const output: ExecutedInterval[] = [];

//   const finalizeNode = (node: Node): Node => {
//     if (!node.hasChildren) {
//       // Leaf
//       if (node.executed) {
//         node.allDescendantsExecuted = true;
//         node.anyExecuted = true;
//         node.results = [
//           { startUtf16: node.startUtf16, endUtf16: node.endUtf16 },
//         ];
//       } else {
//         node.allDescendantsExecuted = false;
//         node.anyExecuted = false;
//         node.results = [];
//       }
//     } else {
//       // Has children; results already filled with children's results
//       if (node.executed && node.allDescendantsExecuted) {
//         // Collapse to the largest interval
//         node.results = [
//           { startUtf16: node.startUtf16, endUtf16: node.endUtf16 },
//         ];
//       }
//       // If not all executed, we keep only children results
//     }

//     return node;
//   };

//   const mergeChildIntoParent = (child: Node, parent: Node) => {
//     parent.hasChildren = true;
//     parent.allDescendantsExecuted =
//       parent.allDescendantsExecuted && child.allDescendantsExecuted;
//     parent.anyExecuted = parent.anyExecuted || child.anyExecuted;
//     parent.results.push(...child.results);
//   };

//   for (const interval of intervals) {
//     const node: Node = {
//       startUtf16: interval.startUtf16,
//       endUtf16: interval.endUtf16,
//       executed: interval.executed,
//       hasChildren: false,
//       allDescendantsExecuted: interval.executed,
//       anyExecuted: interval.executed,
//       results: [],
//     };

//     // Close all open intervals that do NOT contain the current one
//     while (stack.length > 0) {
//       const top = stack[stack.length - 1];

//       const currentIsInsideTop =
//         interval.startUtf16 >= top.startUtf16 &&
//         interval.endUtf16 <= top.endUtf16;

//       if (currentIsInsideTop) break;

//       const finished = finalizeNode(stack.pop()!);

//       if (stack.length > 0) {
//         mergeChildIntoParent(finished, stack[stack.length - 1]);
//       } else {
//         output.push(...finished.results);
//       }
//     }

//     stack.push(node);
//   }

//   // Flush remaining nodes
//   while (stack.length > 0) {
//     const finished = finalizeNode(stack.pop()!);

//     if (stack.length > 0) {
//       mergeChildIntoParent(finished, stack[stack.length - 1]);
//     } else {
//       output.push(...finished.results);
//     }
//   }

//   return output;
// }

// export async function computeLineCoverage(
//   nodes: NodeCoverage[],
//   hitTags: string[],
// ): Promise<void> {
//   const PATH =
//     "/home/chris/repos/nomic-foundation/hardhat6/v-next/example-project/contracts/Coverage.sol";

//   const modifiedNodes = [];

//   const hitSet = new Set(hitTags);

//   // eslint-disable-next-line @typescript-eslint/prefer-for-of -- TODO
//   for (let i = 0; i < nodes.length; i++) {
//     modifiedNodes.push({ ...nodes[i], executed: hitSet.has(nodes[i].tag) });
//   }

//   const fileContent = readFileSync(PATH, "utf8");

//   const minmodifiedNodes = collapseExecutedIntervals(modifiedNodes);

//   console.log("_____________________START");
//   for (const n of nodes) {
//     console.log(
//       `${fileContent.substring(n.startUtf16, n.endUtf16)}: ${n.tag}: ${n.startUtf16} - ${n.endUtf16}\n----\n`,
//     );
//   }

//   console.log(hitTags);
//   console.log("-------");
//   // console.log(JSON.stringify(nodes, null, 2));
//   console.log("---------------");
//   console.log("_____________________END");

//   const minCharI = Math.min(...nodes.map((n) => n.startUtf16));
//   const maxCharI = Math.max(...nodes.map((n) => n.endUtf16));

//   const markedFile: Array<{ char: string; covered: boolean | null }> = [];
//   for (let i = 0; i < fileContent.length; i++) {
//     const covered: boolean | null = i < minCharI || i > maxCharI ? null : false;

//     markedFile.push({
//       char: fileContent[i],
//       covered,
//     });
//   }

//   for (const n of minmodifiedNodes) {
//     for (let i = n.startUtf16; i < n.endUtf16; i++) {
//       markedFile[i].covered = true;
//     }
//   }

//   for (const c of markedFile) {
//     if (c.covered === true) {
//       process.stdout.write(chalk.green(c.char));
//     } else if (c.covered === false) {
//       process.stdout.write(chalk.red(c.char));
//     } else {
//       process.stdout.write(c.char);
//     }
//   }
// }

// /**
//  * @private exposed for testing purposes only
//  */
// export interface Report {
//   [relativePath: string]: {
//     tagExecutionCounts: Map<Tag, number>;
//     lineExecutionCounts: Map<Line, number>;
//     branchExecutionCounts: Map<Branch, number>;

//     executedTagsCount: number;
//     executedLinesCount: number;
//     executedBranchesCount: number;

//     partiallyExecutedLines: Set<Line>;
//     unexecutedLines: Set<Line>;
//   };
// }

// export class CoverageManagerImplementation implements CoverageManager {
//   /**
//    * @private exposed for testing purposes only
//    */
//   public metadata: CoverageMetadata = [];
//   /**
//    * @private exposed for testing purposes only
//    */
//   public data: CoverageData = [];

//   readonly #coveragePath: string;

//   #reportEnabled = true;

//   constructor(coveragePath: string) {
//     this.#coveragePath = coveragePath;
//   }

//   async #getDataPath(id: string): Promise<string> {
//     const dataPath = path.join(this.#coveragePath, "data", id);
//     await ensureDir(dataPath);
//     return dataPath;
//   }

//   public async addData(data: CoverageData): Promise<void> {
//     for (const entry of data) {
//       this.data.push(entry);
//     }

//     //    console.log(JSON.stringify(data, null, 2));

//     log("Added data", JSON.stringify(data, null, 2));
//     // console.log("\n\nAdded data", JSON.stringify(data, null, 2));
//   }

//   public async addMetadata(metadata: CoverageMetadata): Promise<void> {
//     // NOTE: The received metadata might contain duplicates. We deduplicate it
//     // when we generate the report.
//     for (const entry of metadata) {
//       this.metadata.push(entry);
//     }

//     log("Added metadata", JSON.stringify(metadata, null, 2));
//   }

//   public async clearData(id: string): Promise<void> {
//     const dataPath = await this.#getDataPath(id);
//     await remove(dataPath);
//     this.data = [];
//     log("Cleared data from disk and memory");
//   }

//   public async saveData(id: string): Promise<void> {
//     const dataPath = await this.#getDataPath(id);
//     const filePath = path.join(dataPath, `${crypto.randomUUID()}.json`);
//     const data = this.data;
//     await writeJsonFile(filePath, data);
//     log("Saved data", id, filePath);
//   }

//   public async report(...ids: string[]): Promise<void> {
//     if (!this.#reportEnabled) {
//       return;
//     }

//     await this.loadData(...ids);

//     const report = await this.getReport();
//     const lcovReport = this.formatLcovReport(report);
//     const markdownReport = this.formatMarkdownReport(report);

//     const lcovReportPath = path.join(this.#coveragePath, "lcov.info");
//     await writeUtf8File(lcovReportPath, lcovReport);
//     log(`Saved lcov report to ${lcovReportPath}`);

//     console.log(markdownReport);
//     console.log();
//     log("Printed markdown report");
//   }

//   public enableReport(): void {
//     this.#reportEnabled = true;
//   }

//   public disableReport(): void {
//     this.#reportEnabled = false;
//   }

//   /**
//    * @private exposed for testing purposes only
//    */
//   public async loadData(...ids: string[]): Promise<void> {
//     this.data = [];
//     for (const id of ids) {
//       const dataPath = await this.#getDataPath(id);
//       const filePaths = await getAllFilesMatching(dataPath);
//       for (const filePath of filePaths) {
//         const entries = await readJsonFile<CoverageData>(filePath);
//         for (const entry of entries) {
//           this.data.push(entry);
//         }
//         log("Loaded data", id, filePath);
//       }
//     }
//   }

//   /**
//    * @private exposed for testing purposes only
//    */
//   public async getReport(): Promise<Report> {
//     const report: Report = {};

//     const relativePaths = this.metadata.map(({ relativePath }) => relativePath);

//     const allStatements = this.metadata;

//     // console.log("metdadata:");
//     // console.log(JSON.stringify(this.metadata, null, 2));

//     // NOTE: We preserve only the last statement per tag in the statementsByTag map.
//     const statementsByTag = new Map<string, Statement>();
//     for (const statement of allStatements) {
//       statementsByTag.set(statement.tag, statement);
//     }

//     // console.log("\n\nstatementsByTag:");
//     // console.log(statementsByTag);

//     const allExecutedTags = this.data;

//     await computeLineCoverage(this.metadata, allExecutedTags);

//     // console.log("\n\nallExecutedTags:");
//     // console.log(JSON.stringify(allExecutedTags, null, 2));

//     // console.log(
//     //   "+++++++++++++++++++++++++= ALL EXECUTED TAGS +++++++++++++++++++++++++",
//     // );
//     // console.log(JSON.stringify(allExecutedTags, null, 2));

//     const allExecutedStatementsByRelativePath = new Map<string, Statement[]>();
//     for (const tag of allExecutedTags) {
//       // NOTE: We should not encounter an executed tag we don't have metadata for.
//       const statement = statementsByTag.get(tag);
//       assertHardhatInvariant(statement !== undefined, "Expected a statement");

//       const relativePath = statement.relativePath;
//       const allExecutedStatements =
//         allExecutedStatementsByRelativePath.get(relativePath) ?? [];
//       allExecutedStatements.push(statement);
//       allExecutedStatementsByRelativePath.set(
//         relativePath,
//         allExecutedStatements,
//       );
//     }

//     const uniqueExecutedTags = new Set(allExecutedTags);
//     const uniqueUnexecutedTags = Array.from(statementsByTag.keys()).filter(
//       (tag) => !uniqueExecutedTags.has(tag),
//     );

//     const uniqueUnexecutedStatementsByRelativePath = new Map<
//       string,
//       Statement[]
//     >();
//     for (const tag of uniqueUnexecutedTags) {
//       // NOTE: We cannot encounter an executed tag we don't have metadata for.
//       const statement = statementsByTag.get(tag);
//       assertHardhatInvariant(statement !== undefined, "Expected a statement");

//       const relativePath = statement.relativePath;
//       const unexecutedStatements =
//         uniqueUnexecutedStatementsByRelativePath.get(relativePath) ?? [];
//       unexecutedStatements.push(statement);
//       uniqueUnexecutedStatementsByRelativePath.set(
//         relativePath,
//         unexecutedStatements,
//       );
//     }

//     for (const relativePath of relativePaths) {
//       const allExecutedStatements =
//         allExecutedStatementsByRelativePath.get(relativePath) ?? [];
//       const uniqueUnexecutedStatements =
//         uniqueUnexecutedStatementsByRelativePath.get(relativePath) ?? [];

//       const tagExecutionCounts = new Map<Tag, number>();

//       for (const statement of allExecutedStatements) {
//         const tagExecutionCount = tagExecutionCounts.get(statement.tag) ?? 0;
//         tagExecutionCounts.set(statement.tag, tagExecutionCount + 1);
//       }

//       const lineExecutionCounts = new Map<number, number>();
//       const branchExecutionCounts = new Map<Branch, number>();

//       for (const [tag, executionCount] of tagExecutionCounts) {
//         const statement = statementsByTag.get(tag);
//         assertHardhatInvariant(statement !== undefined, "Expected a statement");

//         for (
//           let line = statement.startUtf16;
//           line <= statement.endUtf16;
//           line++
//         ) {
//           const lineExecutionCount = lineExecutionCounts.get(line) ?? 0;
//           lineExecutionCounts.set(line, lineExecutionCount + executionCount);

//           const branchExecutionCount =
//             branchExecutionCounts.get([line, tag]) ?? 0;
//           branchExecutionCounts.set(
//             [line, tag],
//             branchExecutionCount + executionCount,
//           );
//         }
//       }

//       const executedTagsCount = tagExecutionCounts.size;
//       const executedLinesCount = lineExecutionCounts.size;
//       const executedBranchesCount = branchExecutionCounts.size;

//       const partiallyExecutedLines = new Set<number>();
//       const unexecutedLines = new Set<number>();

//       for (const statement of uniqueUnexecutedStatements) {
//         if (!tagExecutionCounts.has(statement.tag)) {
//           tagExecutionCounts.set(statement.tag, 0);
//         }

//         for (
//           let line = statement.startUtf16;
//           line <= statement.endUtf16;
//           line++
//         ) {
//           if (!lineExecutionCounts.has(line)) {
//             lineExecutionCounts.set(line, 0);
//             unexecutedLines.add(line);
//           } else {
//             partiallyExecutedLines.add(line);
//           }

//           if (!branchExecutionCounts.has([line, statement.tag])) {
//             branchExecutionCounts.set([line, statement.tag], 0);
//           }
//         }
//       }

//       report[relativePath] = {
//         tagExecutionCounts,
//         lineExecutionCounts,
//         branchExecutionCounts,

//         executedTagsCount,
//         executedLinesCount,
//         executedBranchesCount,

//         partiallyExecutedLines,
//         unexecutedLines,
//       };
//     }

//     return report;
//   }

//   /**
//    * @private exposed for testing purposes only
//    */
//   public formatLcovReport(report: Report): string {
//     // NOTE: Format follows the guidelines set out in:
//     // https://github.com/linux-test-project/lcov/blob/df03ba434eee724bfc2b27716f794d0122951404/man/geninfo.1#L1409

//     let lcov = "";

//     // A tracefile is made up of several human-readable lines of text, divided
//     // into sections.

//     // If available, a tracefile begins with the testname which is stored in the
//     // following format:
//     // TN:<test name>
//     lcov += "TN:\n";

//     // For each source file referenced in the .gcda file, there is a section
//     // containing filename and coverage data:
//     // SF:<path to the source file>

//     for (const [
//       relativePath,
//       {
//         branchExecutionCounts,
//         executedBranchesCount,
//         lineExecutionCounts,
//         executedLinesCount,
//       },
//     ] of Object.entries(report)) {
//       lcov += `SF:${relativePath}\n`;

//       // NOTE: We report statement coverage as branches to get partial line coverage
//       // data in tools parsing the lcov files. This is because the lcov format
//       // does not support statement coverage.
//       // WARN: This feature is highly experimental and should not be relied upon.

//       // Branch coverage information is stored one line per branch:
//       // BRDA:<line_number>,[<exception>]<block>,<branch>,<taken>

//       // Branch coverage summaries are stored in two lines:
//       // BRF:<number of branches found>
//       // BRH:<number of branches hit>

//       for (const [[line, tag], executionCount] of branchExecutionCounts) {
//         lcov += `BRDA:${line},0,${tag},${executionCount === 0 ? "-" : executionCount}\n`;
//       }
//       lcov += `BRH:${executedBranchesCount}\n`;
//       lcov += `BRF:${branchExecutionCounts.size}\n`;

//       // Then there is a list of execution counts for each instrumented line
//       // (i.e. a line which resulted in executable code):
//       // DA:<line number>,<execution count>[,<checksum>]

//       // At the end of a section, there is a summary about how many lines
//       // were found and how many were actually instrumented:
//       // LH:<number of lines with a non\-zero execution count>
//       // LF:<number of instrumented lines>

//       for (const [line, executionCount] of lineExecutionCounts) {
//         lcov += `DA:${line},${executionCount}\n`;
//       }
//       lcov += `LH:${executedLinesCount}\n`;
//       lcov += `LF:${lineExecutionCounts.size}\n`;

//       // Each sections ends with:
//       // end_of_record
//       lcov += "end_of_record\n";
//     }

//     return lcov;
//   }

//   /**
//    * @private exposed for testing purposes only
//    */
//   public formatRelativePath(relativePath: string): string {
//     if (relativePath.length <= MAX_COLUMN_WIDTH) {
//       return relativePath;
//     }

//     const prefix = "…";

//     const pathParts = relativePath.split(path.sep);

//     const parts = [pathParts[pathParts.length - 1]];
//     let partsLength = parts[0].length;

//     for (let i = pathParts.length - 2; i >= 0; i--) {
//       const part = pathParts[i];
//       if (
//         partsLength +
//           part.length +
//           prefix.length +
//           (parts.length + 1) * path.sep.length <=
//         MAX_COLUMN_WIDTH
//       ) {
//         parts.push(part);
//         partsLength += part.length;
//       } else {
//         break;
//       }
//     }

//     parts.push(prefix);

//     return parts.reverse().join(path.sep);
//   }

//   /**
//    * @private exposed for testing purposes only
//    */
//   public formatCoverage(coverage: number): string {
//     return coverage.toFixed(2).toString();
//   }

//   /**
//    * @private exposed for testing purposes only
//    */
//   public formatLines(lines: Set<number>): string {
//     if (lines.size === 0) {
//       return "-";
//     }

//     const sortedLines = Array.from(lines).toSorted((a, b) => a - b);

//     const intervals = [];
//     let intervalsLength = 0;

//     let startLine = sortedLines[0];
//     let endLine = sortedLines[0];
//     for (let i = 1; i <= sortedLines.length; i++) {
//       if (i < sortedLines.length && sortedLines[i] === endLine + 1) {
//         endLine = sortedLines[i];
//       } else {
//         let interval: string;
//         if (startLine === endLine) {
//           interval = startLine.toString();
//         } else {
//           interval = `${startLine}-${endLine}`;
//         }
//         intervals.push(interval);
//         intervalsLength += interval.length;
//         if (i < sortedLines.length) {
//           startLine = sortedLines[i];
//           endLine = sortedLines[i];
//         }
//       }
//     }

//     const sep = ", ";
//     const suffixSep = ",";
//     const suffix = "…";

//     if (
//       intervalsLength + (intervals.length - 1) * sep.length <=
//       MAX_COLUMN_WIDTH
//     ) {
//       return intervals.join(sep);
//     }

//     while (
//       intervalsLength +
//         (intervals.length - 1) * sep.length +
//         suffix.length +
//         suffixSep.length >
//       MAX_COLUMN_WIDTH
//     ) {
//       const interval = intervals.pop();
//       if (interval !== undefined) {
//         intervalsLength -= interval.length;
//       } else {
//         break;
//       }
//     }

//     return [intervals.join(sep), suffix].join(suffixSep);
//   }

//   /**
//    * @private exposed for testing purposes only
//    */
//   public formatMarkdownReport(report: Report): string {
//     let totalExecutedLines = 0;
//     let totalExecutableLines = 0;

//     let totalExecutedStatements = 0;
//     let totalExecutableStatements = 0;

//     const rows: TableItem[] = [];

//     rows.push([chalk.bold("Coverage Report")]);
//     rows.push(divider);

//     rows.push(
//       [
//         "File Path",
//         "Line %",
//         "Statement %",
//         "Uncovered Lines",
//         "Partially Covered Lines",
//       ].map((s) => chalk.yellow(s)),
//     );

//     const bodyRows = Object.entries(report).map(
//       ([
//         relativePath,
//         {
//           tagExecutionCounts,
//           lineExecutionCounts,
//           executedTagsCount,
//           executedLinesCount,
//           unexecutedLines,
//           partiallyExecutedLines,
//         },
//       ]) => {
//         const lineCoverage =
//           lineExecutionCounts.size === 0
//             ? 0
//             : (executedLinesCount * 100.0) / lineExecutionCounts.size;
//         const statementCoverage =
//           tagExecutionCounts.size === 0
//             ? 0
//             : (executedTagsCount * 100.0) / tagExecutionCounts.size;

//         totalExecutedLines += executedLinesCount;
//         totalExecutableLines += lineExecutionCounts.size;

//         totalExecutedStatements += executedTagsCount;
//         totalExecutableStatements += tagExecutionCounts.size;

//         const row: string[] = [
//           this.formatRelativePath(relativePath),
//           this.formatCoverage(lineCoverage),
//           this.formatCoverage(statementCoverage),
//           this.formatLines(unexecutedLines),
//           this.formatLines(partiallyExecutedLines),
//         ];

//         return row;
//       },
//     );

//     rows.push(...bodyRows);

//     const totalLineCoverage =
//       totalExecutableLines === 0
//         ? 0
//         : (totalExecutedLines * 100.0) / totalExecutableLines;
//     const totalStatementCoverage =
//       totalExecutableStatements === 0
//         ? 0
//         : (totalExecutedStatements * 100.0) / totalExecutableStatements;

//     rows.push(divider);
//     rows.push([
//       chalk.yellow("Total"),
//       this.formatCoverage(totalLineCoverage),
//       this.formatCoverage(totalStatementCoverage),
//       "",
//       "",
//     ]);

//     return formatTable(rows);
//   }
// }

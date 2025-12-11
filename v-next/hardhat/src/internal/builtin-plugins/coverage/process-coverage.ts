import type {
  CoverageMetadata,
  ReportCoverageStatement,
  Statement,
} from "./types.js";

import chalk from "chalk";

/**
 * Processes the raw EDR coverage information for a file and returns the executed and
 * non-executed statements and lines.
 *
 * @param fileContent The original file content being analyzed
 * @param metadata Coverage metadata received from EDR for this file
 * @param hitTags The coverage tags recorded as executed during the test run
 * for this specific file.
 *
 * @returns An object containing:
 * - statements: the executed and not-executed statements
 * - lines: the executed and not-executed line numbers
 */
export function getProcessedCoverageInfo(
  fileContent: string,
  metadata: CoverageMetadata,
  hitTags: string[],
): {
  statements: {
    executed: ReportCoverageStatement[];
    notExecuted: ReportCoverageStatement[];
  };
  lines: {
    executed: Map<number, string>;
    notExecuted: Map<number, string>;
  };
} {
  const rawStatements = getRawEdrExecutedAndNotExecutedStatements(
    metadata,
    hitTags,
  );

  const { minCharI, maxCharI } = getCoverageStartAndEndIndex(
    rawStatements.executedStatements,
    rawStatements.notExecutedStatements,
    fileContent.length,
  );

  const markedFile = createMarkedFile(
    fileContent,
    minCharI,
    maxCharI,
    rawStatements.notExecutedStatements,
  );

  markAsNonExecutableSpecialSubstrings(fileContent, markedFile);

  // Enable this function while debugging to view the coverage for a file
  // printFileCoverageForDebugging(fileContent, markedFile);

  return {
    statements: getProcessedExecutedStatements(markedFile),
    lines: getLinesInfo(fileContent, markedFile),
  };
}

function getRawEdrExecutedAndNotExecutedStatements(
  metadata: CoverageMetadata,
  hitTags: string[],
): {
  executedStatements: Statement[];
  notExecutedStatements: Statement[];
} {
  const hitTagsSet = new Set(hitTags);

  const executedStatements = metadata.filter((node) =>
    hitTagsSet.has(node.tag),
  );
  const notExecutedStatements = metadata.filter(
    (node) => !hitTagsSet.has(node.tag),
  );

  return {
    executedStatements,
    notExecutedStatements,
  };
}

// Determine the minimum and maximum character indexes that define the range where coverage should be calculated,
// excluding parts that the tests never reach. This removes irrelevant sections from coverage analysis,
// such as the beginning or end of each Solidity file.
// Example:
// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.0;
function getCoverageStartAndEndIndex(
  rawExecutedStatements: Statement[],
  rawNotExecutedStatements: Statement[],
  fileLength: number,
): { minCharI: number; maxCharI: number } {
  let minCharI = fileLength;
  let maxCharI = 0;

  for (const s of [...rawExecutedStatements, ...rawNotExecutedStatements]) {
    if (s.startUtf16 < minCharI) {
      minCharI = s.startUtf16;
    }

    if (s.endUtf16 > maxCharI) {
      maxCharI = s.endUtf16;
    }
  }

  return { minCharI, maxCharI };
}

// Return an array with the same length as the file content.
// Each position in the array corresponds to a character in the file.
// The value at each position indicates whether that character was executed during tests (true),
// not executed (false), or not relevant for coverage (null).
// `null` is used to indicate characters that are not executed during test, such as those found at the start or end of every Solidity file.
// Example:
// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.0;
function createMarkedFile(
  fileContent: string,
  minCharI: number,
  maxCharI: number,
  rawNotExecutedStatements: Statement[],
): Array<null | boolean> {
  const markedFile: Array<null | boolean> = new Array(fileContent.length).fill(
    null,
  );

  // Initially mark all characters that may be executed during the tests as true. They will be set to false later
  // if they are not executed. The coverage statement received from EDR will provide this information.
  // Setting everything to true first simplifies the logic for extracting coverage data.
  // Starting with false and toggling only covered characters would make statement processing more complex.
  for (let i = minCharI; i < maxCharI; i++) {
    if (charMustBeIgnored(fileContent[i])) {
      continue;
    }

    markedFile[i] = true;
  }

  for (const n of rawNotExecutedStatements) {
    for (let i = n.startUtf16; i < n.endUtf16; i++) {
      if (charMustBeIgnored(fileContent[i])) {
        continue;
      }

      markedFile[i] = false;
    }
  }

  return markedFile;
}

// The following characters are not relevant for the code coverage, so they must be ignored
// when marking characters as executed (true) or not executed (false)
function charMustBeIgnored(c: string): boolean {
  return /\s/.test(c) || c === "{" || c === "}";
}

// Mark different types of substrings as not relevant for code coverage (set them to null).
// For example, all "else" substrings or comments are not relevant for code coverage.
function markAsNonExecutableSpecialSubstrings(
  fileContent: string,
  markedFile: Array<null | boolean>,
) {
  // Coments that start with //
  markMatchingCharsWithNull(fileContent, markedFile, /\/\/.*?(?=\n|$)/g);

  // Comments wrapped between /* and */
  markMatchingCharsWithNull(fileContent, markedFile, /\/\*[\s\S]*?\*\//g);

  // Lines containing `else`, since they do not represent executable code by themselves.
  // Keep in mind that `else` is preceded by a closing brace and followed by an opening brace.
  // This can span multiple lines.
  markMatchingCharsWithNull(fileContent, markedFile, /\}\s*\belse\b\s*\{/g);

  // Lines containing the function signature. This can span multiple lines
  markMatchingCharsWithNull(
    fileContent,
    markedFile,
    /^\s*(function\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\([\s\S]*?\)[^{]*?)(?=\s*\{)/gm,
  );

  // Lines containing the catch signature. This can span multiple lines.
  markMatchingCharsWithNull(
    fileContent,
    markedFile,
    /\bcatch\b(?:\s+[A-Za-z_][A-Za-z0-9_]*)?\s*(?:\([\s\S]*?\))?(?=\s*\{)/g,
  );
}

function markMatchingCharsWithNull(
  fileContent: string,
  markedFile: Array<null | boolean>,
  regex: RegExp,
) {
  for (const match of fileContent.matchAll(regex)) {
    for (let i = match.index; i < match.index + match[0].length; i++) {
      markedFile[i] = null;
    }
  }
}

// Generate non overlapping coverage statements. Every character between the start and end indexes is guaranteed
// to be either executed or not executed.
// Unlike the statements received from EDR, which may include nested sub statements, these are processed
// and have no sub statements or overlapping statements.
// Example:
// [
//   { start: 12, end: 20, executed: true  },
//   { start: 15, end: 17, executed: true }
// ]
// ->
// [
//   { start: 12, end: 20, executed: true  }
// ]
function getProcessedExecutedStatements(markedFile: Array<boolean | null>): {
  executed: ReportCoverageStatement[];
  notExecuted: ReportCoverageStatement[];
} {
  const executed = generateProcessedStatements(markedFile, true);
  const notExecuted = generateProcessedStatements(markedFile, false);

  return {
    executed,
    notExecuted,
  };
}

// Based on the marked file, where each character is marked as either executed (true) or not executed (false),
// generate non-overlapping statements that indicate the start and end indices, along with whether they were executed or not.
function generateProcessedStatements(
  markedFile: Array<boolean | null>,
  executed: boolean,
): ReportCoverageStatement[] {
  const ranges: ReportCoverageStatement[] = [];
  const n = markedFile.length;

  let start = -1;

  for (let i = 0; i < n; i++) {
    if (markedFile[i] === executed) {
      if (start === -1) {
        start = i; // begin new range
      }
    } else {
      if (start !== -1) {
        ranges.push({ startUtf16: start, endUtf16: i - 1, executed });
        start = -1;
      }
    }
  }

  // close last range if file ends inside a run
  if (start !== -1) {
    ranges.push({ startUtf16: start, endUtf16: n - 1, executed });
  }

  return ranges;
}

// Return the executed and non executed lines based on the marked file.
// Some lines are excluded from the execution count, for example, comments.
function getLinesInfo(
  fileContent: string,
  markedFile: Array<boolean | null>,
): {
  executed: Map<number, string>;
  notExecuted: Map<number, string>;
} {
  const lines: string[] = [];
  const lineExecuted: Array<boolean | null> = [];

  let lineStart = 0;

  let allNull = true;
  let allTrueOrNull = true;

  for (let i = 0; i < fileContent.length; i++) {
    const c = fileContent[i];
    const v = markedFile[i];

    if (v !== null) {
      allNull = false;
    }
    if (v !== true && v !== null) {
      allTrueOrNull = false;
    }

    if (c === "\n") {
      const line = fileContent.slice(lineStart, i);

      lines.push(line);

      if (allNull) {
        lineExecuted.push(null);
      } else if (allTrueOrNull) {
        lineExecuted.push(true);
      } else {
        lineExecuted.push(false);
      }

      lineStart = i + 1;
      allNull = true;
      allTrueOrNull = true;
    }
  }

  const executed: Map<number, string> = new Map();
  const notExecuted: Map<number, string> = new Map();

  // When adding to the map, use +1 on the index because file lines start at 1, not 0
  for (let j = 0; j < lines.length; j++) {
    const line = lines[j];

    if (lineExecuted[j] === null) {
      continue;
    }

    if (lineExecuted[j] === true) {
      executed.set(j + 1, line);
    } else if (lineExecuted[j] === false) {
      notExecuted.set(j + 1, line);
    }
  }

  return { executed, notExecuted };
}
// Enable this function while debugging to display the coverage for a file.
// The file will be printed with green characters when they are executed, red characters when they are not executed,
// and gray characters when they are irrelevant for code coverage.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- this function can be enabled for debugging purposes
function printFileCoverageForDebugging(
  fileContent: string,
  markedFile: Array<boolean | null>,
): void {
  for (let i = 0; i < markedFile.length; i++) {
    if (markedFile[i] === null) {
      process.stdout.write(chalk.gray(fileContent[i]));
    } else if (markedFile[i] === true) {
      process.stdout.write(chalk.green(fileContent[i]));
    } else {
      process.stdout.write(chalk.red(fileContent[i]));
    }
  }
}

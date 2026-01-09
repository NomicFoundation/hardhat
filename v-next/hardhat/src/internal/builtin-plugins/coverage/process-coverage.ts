import type {
  CoverageMetadata,
  ReportCoverageStatement,
  Statement,
} from "./types.js";

import chalk from "chalk";

// Use constants for the Uint8Array to improve memory usage (1 byte vs 8 bytes per item)
const STATUS_NOT_EXECUTED = 0; // equivalent to false
const STATUS_EXECUTED = 1; // equivalent to true
const STATUS_IGNORED = 2; // equivalent to null

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

  const executedStatements: Statement[] = [];
  const notExecutedStatements: Statement[] = [];
  for (const node of metadata) {
    if (hitTagsSet.has(node.tag)) {
      executedStatements.push(node);
    } else {
      notExecutedStatements.push(node);
    }
  }

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
// The value at each position indicates whether that character was executed during tests (STATUS_EXECUTED),
// not executed (STATUS_NOT_EXECUTED), or not relevant for coverage (STATUS_IGNORED).
// STATUS_IGNORED is used to indicate characters that are not executed during test, such as those found at the start or end of every Solidity file.
// Example:
// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.0;
function createMarkedFile(
  fileContent: string,
  minCharI: number,
  maxCharI: number,
  rawNotExecutedStatements: Statement[],
): Uint8Array {
  // Use Uint8Array instead of Array<null | boolean> for memory efficiency.
  // We initialize with STATUS_IGNORED (equivalent to filling with null)
  const markedFile = new Uint8Array(fileContent.length).fill(STATUS_IGNORED);

  // Initially mark all characters that may be executed during the tests as STATUS_EXECUTED. They will be set to false later
  // if they are not executed. The coverage statement received from EDR will provide this information.
  // Setting everything to true first simplifies the logic for extracting coverage data.
  // Starting with false and toggling only covered characters would make statement processing more complex.
  for (let i = minCharI; i < maxCharI; i++) {
    if (charMustBeIgnored(fileContent[i])) {
      continue;
    }

    markedFile[i] = STATUS_EXECUTED;
  }

  for (const n of rawNotExecutedStatements) {
    for (let i = n.startUtf16; i < n.endUtf16; i++) {
      if (charMustBeIgnored(fileContent[i])) {
        continue;
      }

      markedFile[i] = STATUS_NOT_EXECUTED;
    }
  }

  return markedFile;
}

// The following characters are not relevant for the code coverage, so they must be ignored
// when marking characters as executed (true) or not executed (false)
function charMustBeIgnored(c: string): boolean {
  const code = c.charCodeAt(0);

  return (
    code === 32 || // Space
    (code >= 9 && code <= 13) || // \t (9), \n (10), \v (11), \f (12), \r (13)
    code === 123 || // {
    code === 125 // }
  );
}

// Mark different types of substrings as not relevant for code coverage (set them to STATUS_IGNORED).
// For example, all "else" substrings or comments are not relevant for code coverage.
function markAsNonExecutableSpecialSubstrings(
  fileContent: string,
  markedFile: Uint8Array,
) {
  // Comments that start with //
  markMatchingCharsWithIgnored(fileContent, markedFile, /\/\/.*?(?=\n|$)/g);

  // Comments wrapped between /* and */
  markMatchingCharsWithIgnored(fileContent, markedFile, /\/\*[\s\S]*?\*\//g);

  // Lines containing `else`, since they do not represent executable code by themselves.
  // Keep in mind that `else` is preceded by a closing brace and followed by an opening brace.
  // This can span multiple lines.
  markMatchingCharsWithIgnored(fileContent, markedFile, /\}\s*\belse\b\s*\{/g);

  // Lines containing the function signature. This can span multiple lines
  markMatchingCharsWithIgnored(
    fileContent,
    markedFile,
    /^\s*(function\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\([\s\S]*?\)[^{]*?)(?=\s*\{)/gm,
  );

  // Lines containing the catch signature. This can span multiple lines.
  markMatchingCharsWithIgnored(
    fileContent,
    markedFile,
    /\bcatch\b(?:\s+[A-Za-z_][A-Za-z0-9_]*)?\s*(?:\([\s\S]*?\))?(?=\s*\{)/g,
  );
}

function markMatchingCharsWithIgnored(
  fileContent: string,
  markedFile: Uint8Array,
  regex: RegExp,
) {
  for (const match of fileContent.matchAll(regex)) {
    for (let i = match.index; i < match.index + match[0].length; i++) {
      markedFile[i] = STATUS_IGNORED;
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
/* eslint-disable-next-line @typescript-eslint/no-unused-vars
-- currently not used, but it will be used to create more detailed.
It will be used to return statements from the function `getProcessedCoverageInfo` */
function getProcessedExecutedStatements(markedFile: Uint8Array): {
  executed: ReportCoverageStatement[];
  notExecuted: ReportCoverageStatement[];
} {
  const executed = generateProcessedStatements(markedFile, STATUS_EXECUTED);
  const notExecuted = generateProcessedStatements(
    markedFile,
    STATUS_NOT_EXECUTED,
  );

  return {
    executed,
    notExecuted,
  };
}

// Based on the marked file, where each character is marked as either executed (STATUS_EXECUTED) or not executed (STATUS_NOT_EXECUTED),
// generate non-overlapping statements that indicate the start and end indices, along with whether they were executed or not.
function generateProcessedStatements(
  markedFile: Uint8Array,
  targetStatus: number,
): ReportCoverageStatement[] {
  const ranges: ReportCoverageStatement[] = [];
  const n = markedFile.length;

  let start = -1;

  for (let i = 0; i < n; i++) {
    if (markedFile[i] === targetStatus) {
      if (start === -1) {
        start = i; // begin new range
      }
    } else {
      if (start !== -1) {
        // Map back to boolean for the output object
        ranges.push({
          startUtf16: start,
          endUtf16: i - 1,
          executed: targetStatus === STATUS_EXECUTED,
        });
        start = -1;
      }
    }
  }

  // close last range if file ends inside a run
  if (start !== -1) {
    ranges.push({
      startUtf16: start,
      endUtf16: n - 1,
      executed: targetStatus === STATUS_EXECUTED,
    });
  }

  return ranges;
}

// Return the executed and non executed lines based on the marked file.
// Some lines are excluded from the execution count, for example, comments.
function getLinesInfo(
  fileContent: string,
  markedFile: Uint8Array,
): {
  executed: Map<number, string>;
  notExecuted: Map<number, string>;
} {
  const lines: string[] = [];
  const lineExecuted: Array<boolean | null> = [];

  let lineStart = 0;

  let allIgnored = true;
  let allExecutedOrIgnored = true;

  for (let i = 0; i < fileContent.length; i++) {
    const c = fileContent[i];
    const v = markedFile[i];

    if (v !== STATUS_IGNORED) {
      allIgnored = false;
    }
    if (v === STATUS_NOT_EXECUTED) {
      allExecutedOrIgnored = false;
    }

    if (c === "\n") {
      const line = fileContent.slice(lineStart, i);

      lines.push(line);

      if (allIgnored) {
        lineExecuted.push(null);
      } else if (allExecutedOrIgnored) {
        lineExecuted.push(true);
      } else {
        lineExecuted.push(false);
      }

      lineStart = i + 1;
      allIgnored = true;
      allExecutedOrIgnored = true;
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
  markedFile: Uint8Array,
): void {
  for (let i = 0; i < markedFile.length; i++) {
    if (markedFile[i] === STATUS_IGNORED) {
      process.stdout.write(chalk.gray(fileContent[i]));
    } else if (markedFile[i] === STATUS_EXECUTED) {
      process.stdout.write(chalk.green(fileContent[i]));
    } else {
      process.stdout.write(chalk.red(fileContent[i]));
    }
  }
}

import type {
  CoverageMetadata,
  ReportCoverageStatement,
  Statement,
} from "./types.js";

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
    fileContent.length,
    minCharI,
    maxCharI,
    rawStatements.notExecutedStatements,
  );

  return {
    statements: getProcessedExecutedStatements(fileContent, markedFile),
    lines: getLinesInfo(fileContent, markedFile, minCharI, maxCharI),
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
  fileContentLength: number,
  minCharI: number,
  maxCharI: number,
  rawNotExecutedStatements: Statement[],
): Array<null | boolean> {
  const markedFile: Array<null | boolean> = new Array(fileContentLength).fill(
    null,
  );

  // Initially mark all characters that may be executed during the tests as true. They will be set to false later
  // if they are not executed. The coverage statement received from EDR will provide this information.
  // Setting everything to true first simplifies the logic for extracting coverage data.
  // Starting with false and toggling only covered characters would make statement processing more complex.
  for (let i = minCharI; i < maxCharI; i++) {
    markedFile[i] = true;
  }

  for (const n of rawNotExecutedStatements) {
    for (let i = n.startUtf16; i < n.endUtf16; i++) {
      markedFile[i] = false;
    }
  }

  return markedFile;
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
function getProcessedExecutedStatements(
  fileContent: string,
  markedFile: Array<boolean | null>,
): {
  executed: ReportCoverageStatement[];
  notExecuted: ReportCoverageStatement[];
} {
  // Note: `markedFile` is modified in place
  extendStatementToElse(fileContent, markedFile);

  const executed = generateProcessedStatements(markedFile, true);
  const notExecuted = generateProcessedStatements(markedFile, false);

  return {
    executed,
    notExecuted,
  };
}

// The else keyword is not correctly represented in the EDR statement, since it does not appear
// in the execution intervals that indicate hit or not hit. To infer whether an else branch was executed,
// we inspect the characters that follow it. If those characters were executed, we mark the else as executed;
// if not, we mark it as not executed.
function extendStatementToElse(
  fileContent: string,
  markedFile: Array<boolean | null>,
) {
  const elseWord = "else";

  let pos = fileContent.indexOf(elseWord, 0);

  while (pos !== -1) {
    const firstCharAfterElse = pos + elseWord.length;

    if (markedFile[firstCharAfterElse] === false) {
      // Mark all chars of "else" as not covered
      markedFile[pos] = false; // e
      markedFile[pos + 1] = false; // l
      markedFile[pos + 2] = false; // s
      markedFile[pos + 3] = false; // e
    }

    pos = fileContent.indexOf(elseWord, pos + elseWord.length);
  }
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
  minCharI: number,
  maxCharI: number,
): {
  executed: Map<number, string>;
  notExecuted: Map<number, string>;
} {
  const lines: Array<string | null> = [];
  const lineExecuted: Array<boolean | null> = [];

  let tmpLine: string | null = null;
  let tmpExecuted: boolean | null = null;

  for (let i = 0; i < fileContent.length; i++) {
    const c = fileContent[i];

    if (tmpLine === null) {
      tmpLine = "";
      tmpExecuted = i >= minCharI && i <= maxCharI ? true : null;
    }

    tmpLine += c;

    if (i >= minCharI && i <= maxCharI) {
      if (!["{", "}", "\n", " "].includes(c)) {
        tmpExecuted =
          tmpExecuted === null ? null : tmpExecuted && markedFile[i];
      }
    }

    if (c === "\n") {
      // A line has ended, analyze whether it should be counted for coverage or not
      let emptyLine = false;
      const possibleLine = tmpLine;

      if (REGEXES_TO_REMOVE_LINES.some((regex) => regex.test(possibleLine))) {
        emptyLine = true;
      }

      if (!emptyLine) {
        lines.push(tmpLine);
        lineExecuted.push(tmpExecuted);
      } else {
        lines.push(null);
        lineExecuted.push(null);
      }

      tmpLine = null;
    }
  }

  const executed: Map<number, string> = new Map();
  const notExecuted: Map<number, string> = new Map();

  // When adding to the map, use +1 on the index because file lines start at 1, not 0
  for (let j = 0; j < lines.length; j++) {
    const line = lines[j];

    if (line === null) {
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

const REGEXES_TO_REMOVE_LINES = [
  // Matches when only an `else` is present in a line, or at most a `else` with `{` after or `}` before.
  // Match examples:
  // - else
  // - } else {
  // - } else
  // - else {
  /^\s*(?:\}\s*)?else(?:\s*\{)?\s*$/,
  // Matches when a `catch` is present in a line.
  // Match examples:
  // - } catch {
  // - } catch catch Error(string memory reason) {
  /^\s*(?:\}\s*)?catch.*/,
  // Matches a line when:
  // - only spaces are present
  // - only { is present (allow multiple spaces before and after)
  // - only } is present (allow multiple spaces before and after)
  // - only \n is present (allow multiple spaces before and after)
  /^\s*(?:\{|\}|\n)?\s*$/,
  // Matches when a line is a comment satrting with //, unless there is code before it
  // Match:
  // // This is a comment
  // Not a match:
  // uint256 x = 0; // This is a comment
  /^\s*\/\/.*/,
  // Matches when a line is a comment starting with /* (unless there is code before it)
  // Match:
  // /* This is a comment
  // Not a match:
  // uint256 x = 0; /* This is a comment
  /^\s*\/\*/,
  // Matches when a line is a comment ending with */ (unless there is code before it)
  // Match:
  // This is a comment */
  // Not a match:
  // This is a comment */ uint256 x = 0;
  /\*\/\s*$/,
  // Matches when a line is part of a block comment.
  // Example:
  // * This is a comment
  /^\s*\*(?!\/)/,
];

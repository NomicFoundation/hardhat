import type {
  CoverageMetadata,
  ReportCoverageStatement,
  Statement,
} from "./types.js";

import chalk from "chalk";

/**
 * Processes coverage information for a file and returns the executed and
 * non-executed statements and lines.
 *
 * @param fileContent The original file content being analyzed
 * @param metadata Coverage metadata received from EDR for this file
 * @param hitTags The coverage tags recorded as executed during the test run
 * for this specific file.
 *
 * @returns An object containing:
 * - statments: the executed and not-executed statements
 * - lines: the executed and not-executed line numbers
 */
export function getProcessedCoverageInfo(
  fileContent: string,
  metadata: CoverageMetadata,
  hitTags: string[],
): {
  statments: {
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
  );

  const markedFileContent = createMarkedFile(
    fileContent,
    minCharI,
    maxCharI,
    rawStatements.notExecutedStatements,
  );

  return {
    statments: getProcessedExecutedStatments(fileContent, markedFileContent),
    lines: getLinesInfo(fileContent, markedFileContent, minCharI, maxCharI),
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
): { minCharI: number; maxCharI: number } {
  let minCharI = Infinity;
  let maxCharI = -Infinity;

  for (const s of [...rawExecutedStatements, ...rawNotExecutedStatements]) {
    const start = s.startUtf16;
    const end = s.endUtf16;

    if (start < minCharI) {
      minCharI = start;
    }

    if (end > maxCharI) {
      maxCharI = end;
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
  const markedFileContent: Array<null | boolean> = new Array(
    fileContent.length,
  ).fill(null);

  // Initially mark all characters that may be executed during the tests as true. They will be set to false later
  // if they are not executed. The coverage statement received from EDR will provide this information.
  // Setting everything to true first simplifies the logic for extracting coverage data.
  // Starting with false and toggling only covered characters would make statement processing more complex.
  for (let i = minCharI; i < maxCharI; i++) {
    markedFileContent[i] = true;
  }

  for (const n of rawNotExecutedStatements) {
    for (let i = n.startUtf16; i < n.endUtf16; i++) {
      markedFileContent[i] = false;
    }
  }

  return markedFileContent;
}

// Generate non overlapping coverage statements. Every character between the start and end indexes is guaranteed
// to be either executed or not executed.
// Unlike the statements received from EDR, which may include nested sub statements, these are processed
// and have no sub statements or overlapping statements.
function getProcessedExecutedStatments(
  fileContent: string,
  markedFileContent: Array<boolean | null>,
): {
  executed: ReportCoverageStatement[];
  notExecuted: ReportCoverageStatement[];
} {
  // Note: `markedFileContent` is modified in place
  extendStatementToElse(fileContent, markedFileContent);

  const executed = generateProcessedStatments(markedFileContent, true);
  const notExecuted = generateProcessedStatments(markedFileContent, false);

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
  markedFileContent: Array<boolean | null>,
) {
  const elseWord = "else";

  let pos = fileContent.indexOf(elseWord, 0);

  while (pos !== -1) {
    const firstCharAfterElse = pos + elseWord.length;

    if (markedFileContent[firstCharAfterElse] === false) {
      // Mark all chars of "else" as not covered
      markedFileContent[pos] = false; // e
      markedFileContent[pos + 1] = false; // l
      markedFileContent[pos + 2] = false; // s
      markedFileContent[pos + 3] = false; // e
    }

    pos = fileContent.indexOf(elseWord, pos + elseWord.length);
  }
}

function generateProcessedStatments(
  markedFileContent: Array<boolean | null>,
  executed: boolean,
): ReportCoverageStatement[] {
  const ranges: ReportCoverageStatement[] = [];
  const n = markedFileContent.length;

  let start = -1;

  for (let i = 0; i < n; i++) {
    if (markedFileContent[i] === executed) {
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

function getLinesInfo(
  fileContent: string,
  markedFileContent: Array<boolean | null>,
  minCharI: number,
  maxCharI: number,
): {
  executed: Map<number, string>;
  notExecuted: Map<number, string>;
} {
  const lines: string[] = [];
  const lineExecuted: Array<boolean | null> = [];

  let tmpLine: string | null = null;
  let tmpExecuted: boolean | null = null;

  let ik = 0;
  for (const c of markedFileContent) {
    if (c === true) {
      process.stdout.write(chalk.green(fileContent[ik]));
    } else if (c === false) {
      process.stdout.write(chalk.red(fileContent[ik]));
    } else {
      process.stdout.write(fileContent[ik]);
    }

    ik++;
  }

  for (let i = 0; i < fileContent.length; i++) {
    const c = fileContent[i];

    if (tmpLine === null) {
      tmpLine = "";
      tmpExecuted =
        i >= minCharI && i <= maxCharI ? markedFileContent[i] : null;
    }

    tmpLine += c;

    if (i >= minCharI && i <= maxCharI) {
      if (!["{", "}", "\n", " "].includes(c)) {
        tmpExecuted =
          tmpExecuted === null ? null : tmpExecuted && markedFileContent[i];
      }
    }

    if (c === "\n") {
      let emptyLine = true;

      if (
        // Regex to match when only an `else` is present in a line, or at most a `else` with `{` after or `}` before.
        // Example:
        // - else
        // - } else {
        // - } else
        // - else {
        !/^\s*(?:\}\s*)?else(?:\s*\{)?\s*$/.test(tmpLine) &&
        // Matches when:
        // - only spaces are present
        // - only { is present (allow multiple spaces before and after)
        // - only } is present (allow multiple spaces before and after)
        // - only \n is present (allow multiple spaces before and after)
        !/^\s*(?:\{|\}|\n)?\s*$/.test(tmpLine)
      ) {
        emptyLine = false;
      }

      if (!emptyLine) {
        lines.push(tmpLine);
        lineExecuted.push(tmpExecuted);
      }

      tmpLine = null;
    }
  }

  const executed: Map<number, string> = new Map();
  const notExecuted: Map<number, string> = new Map();

  // for (let m = 0; m < lines.length; m++) {
  //   console.log("----");
  //   console.log(lines[m] + " " + lineExecuted[m]);
  // }

  // When adding to the map, use +1 on the index because file lines start at 1, not 0
  for (let j = 0; j < lines.length; j++) {
    if (lineExecuted[j] === true) {
      executed.set(j + 1, lines[j]);
    } else if (lineExecuted[j] === false) {
      notExecuted.set(j + 1, lines[j]);
    }
  }

  return { executed, notExecuted };
}

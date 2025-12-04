import type { CoverageTestScenario } from "../types.js";

import { getTestScenarioFileRelativePath } from "../utils.js";

const relativePath = getTestScenarioFileRelativePath("random-formatting");

export const COVERAGE_TEST_SCENARIO_RANDOM_FORMATTING: CoverageTestScenario = {
  description:
    "should report coverage for a if-else statement that is formatted in a random way where only the else branch is executed",
  expectedResult: {
    [relativePath]: {
      executedStatementsCount: 3,
      unexecutedStatementsCount: 2,
      lineExecutionCounts: new Map([
        [11, 1],
        [14, 0],
        [20, 1],
      ]),
      executedLinesCount: 2,
      unexecutedLines: new Set([14]),
    },
  },
  // The following variables can be collected by running the code coverage for the Coverage.t.sol test file
  // in this folder against the Coverage.sol source file.
  metadata: [
    {
      relativePath,
      tag: "b60cd0bc493ce0c6995c1059474106354cd532f1b2beb40d7401af210fa0e2fc",
      startUtf16: 139,
      endUtf16: 339,
    },
    {
      relativePath,
      tag: "e1a61a2b1890a66137b642e14c0e783bc4e24353d15bce10e177e8778a67b526",
      startUtf16: 264,
      endUtf16: 294,
    },
    {
      relativePath,
      tag: "9c42dba1a090a5c64ecb936cc02b00859222a1235043e6b5efae4cb7c96649ce",
      startUtf16: 270,
      endUtf16: 287,
    },
    {
      relativePath,
      tag: "5b3845984952c871e49e5ad1974c421eefeba74ad04e8cc14fbb6d2cecf7c840",
      startUtf16: 303,
      endUtf16: 339,
    },
    {
      relativePath,
      tag: "078c5aaa8e09ccf53833c7f946179b1e715d68faab671672872a02a11ce59c08",
      startUtf16: 309,
      endUtf16: 332,
    },
  ],
  data: [
    "5b3845984952c871e49e5ad1974c421eefeba74ad04e8cc14fbb6d2cecf7c840",
    "b60cd0bc493ce0c6995c1059474106354cd532f1b2beb40d7401af210fa0e2fc",
    "078c5aaa8e09ccf53833c7f946179b1e715d68faab671672872a02a11ce59c08",
  ],
};

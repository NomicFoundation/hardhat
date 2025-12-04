import type { CoverageTestScenario } from "../types.js";

import { getTestScenarioFileRelativePath } from "../utils.js";

const relativePath = getTestScenarioFileRelativePath("ignore-comments");

export const COVERAGE_TEST_SCENARIO_IGNORE_COMMENTS: CoverageTestScenario = {
  description: "should not counte the coverage for lines that are comments",
  expectedResult: {
    [relativePath]: {
      executedStatementsCount: 4,
      unexecutedStatementsCount: 0,
      lineExecutionCounts: new Map([
        [11, 1],
        [22, 1],
        [24, 1],
        [26, 1],
      ]),
      executedLinesCount: 4,
      unexecutedLines: new Set([]),
    },
  },
  // The following variables can be collected by running the code coverage for the Coverage.t.sol test file
  // in this folder against the Coverage.sol source file.
  metadata: [
    {
      relativePath,
      tag: "43c232206a9610d45ae13127b4cc35fe169a22d50ecd0d1bc9d360a110740b28",
      startUtf16: 139,
      endUtf16: 322,
    },
    {
      relativePath,
      tag: "167d6c75984544ce598da96ba0c3b1aaaea965c6de043d9d960f8c2e91cde520",
      startUtf16: 322,
      endUtf16: 519,
    },
    {
      relativePath,
      tag: "c547d244b195210ba59a97d590fa8d03a7ba6fa16377acb5f5a51a678070c2d3",
      startUtf16: 519,
      endUtf16: 655,
    },
    {
      relativePath,
      tag: "59df75f7c2d622dd759da5dba81f22096b444d7ed6d64d3e6787f12a4e4d7422",
      startUtf16: 655,
      endUtf16: 675,
    },
  ],
  data: [
    "167d6c75984544ce598da96ba0c3b1aaaea965c6de043d9d960f8c2e91cde520",
    "43c232206a9610d45ae13127b4cc35fe169a22d50ecd0d1bc9d360a110740b28",
    "c547d244b195210ba59a97d590fa8d03a7ba6fa16377acb5f5a51a678070c2d3",
    "59df75f7c2d622dd759da5dba81f22096b444d7ed6d64d3e6787f12a4e4d7422",
  ],
};

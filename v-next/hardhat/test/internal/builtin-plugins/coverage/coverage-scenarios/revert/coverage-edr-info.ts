import type { CoverageTestScenario } from "../types.js";

import { getTestScenarioFileRelativePath } from "../utils.js";

const relativePath = getTestScenarioFileRelativePath("revert");

export const COVERAGE_TEST_SCENARIO_REVERT: CoverageTestScenario = {
  description: "should report coverage for revert statements",
  expectedResult: {
    [relativePath]: {
      executedStatementsCount: 1,
      unexecutedStatementsCount: 1,
      lineExecutionCounts: new Map([
        [6, 1],
        [8, 0],
      ]),
      executedLinesCount: 1,
      unexecutedLines: new Set([8]),
    },
  },
  // The following variables can be collected by running the code coverage for the Coverage.t.sol test file
  // in this folder against the Coverage.sol source file.
  metadata: [
    {
      relativePath,
      tag: "9ac8853d1bcd5e887aca09c4e71a33102f8606eb9aab236010e18cd572251861",
      startUtf16: 141,
      endUtf16: 171,
    },
    {
      relativePath,
      tag: "04d097e476a8bf922af36d2fbf54bbaf7282e61c42612d1d9b001c5aae533d02",
      startUtf16: 171,
      endUtf16: 186,
    },
  ],
  data: [
    "9ac8853d1bcd5e887aca09c4e71a33102f8606eb9aab236010e18cd572251861",
    "9ac8853d1bcd5e887aca09c4e71a33102f8606eb9aab236010e18cd572251861",
  ],
};

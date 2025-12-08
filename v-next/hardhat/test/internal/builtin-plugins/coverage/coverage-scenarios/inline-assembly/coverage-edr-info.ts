import type { CoverageTestScenario } from "../types.js";

import { getTestScenarioFileRelativePath } from "../utils.js";

const relativePath = getTestScenarioFileRelativePath("inline-assembly");

export const COVERAGE_TEST_SCENARIO_INLINE_ASSEMBLY: CoverageTestScenario = {
  description: "should report coverage for inline assembly",
  expectedResult: {
    [relativePath]: {
      executedStatementsCount: 1,
      unexecutedStatementsCount: 0,
      lineExecutionCounts: new Map([
        [7, 1],
        [8, 1],
      ]),
      executedLinesCount: 2,
      unexecutedLines: new Set([]),
    },
  },
  // The following variables can be collected by running the code coverage for the Coverage.t.sol test file
  // in this folder against the Coverage.sol source file.
  metadata: [
    {
      relativePath,
      tag: "6f977bfbd46440310171057b8361d923d7418dfb1a04fec95c6506b118d6db58",
      startUtf16: 148,
      endUtf16: 258,
    },
  ],
  data: ["6f977bfbd46440310171057b8361d923d7418dfb1a04fec95c6506b118d6db58"],
};

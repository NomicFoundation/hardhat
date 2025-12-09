import path from "path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";

const testFilePath = path.join(
  ".",
  "contracts",
  "ignore-comments",
  "Coverage.t.sol",
);

const sourceFilePath = testFilePath.replace(".t", "");

export const COVERAGE_TEST_SCENARIO_IGNORE_COMMENTS: CoverageTestScenario = {
  description: "should not count the coverage for lines that are comments",
  sourceFilePath,
  testFilePath,
  expectedResult: {
    executedStatementsCount: 4,
    unexecutedStatementsCount: 0,
    lineExecutionCounts: new Map([
      [11, 1],
      [22, 1],
      [23, 1],
      [25, 1],
    ]),
    executedLinesCount: 4,
    unexecutedLines: new Set([]),
  },
};

import path from "path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";

const testFilePath = path.join(".", "contracts", "one-liner", "Coverage.t.sol");

const sourceFilePath = testFilePath.replace(".t", "");

export const COVERAGE_TEST_SCENARIO_ONE_LINER: CoverageTestScenario = {
  description:
    "should report coverage for if-else statements written on as one-liners",
  sourceFilePath,
  testFilePath,
  expectedResult: {
    executedStatementsCount: 5,
    unexecutedStatementsCount: 6,
    lineExecutionCounts: new Map([
      [11, 0],
      [13, 0],
      [15, 1],
    ]),
    executedLinesCount: 1,
    unexecutedLines: new Set([11, 13]),
  },
};

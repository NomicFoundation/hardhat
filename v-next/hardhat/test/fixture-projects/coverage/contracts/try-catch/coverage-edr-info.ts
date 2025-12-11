import path from "path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";

const testFilePath = path.join(".", "contracts", "try-catch", "Coverage.t.sol");

const sourceFilePath = testFilePath.replace(".t", "");

export const COVERAGE_TEST_SCENARIO_TRY_CATCH: CoverageTestScenario = {
  description: "should report coverage for try-catch blocks",
  sourceFilePath,
  testFilePath,
  expectedResult: {
    executedStatementsCount: 12,
    unexecutedStatementsCount: 5,
    lineExecutionCounts: new Map([
      [11, 1],
      [13, 1],
      [14, 0],
      [16, 1],
      [19, 1],
      [20, 0],
      [22, 1],
      [25, 1],
      [26, 0],
      [30, 1],
      [33, 1],
      [34, 1],
      [36, 0],
      [41, 1],
      [46, 1],
      [47, 0],
      [51, 1],
    ]),
    executedLinesCount: 12,
    unexecutedLines: new Set([14, 20, 26, 36, 47]),
  },
};

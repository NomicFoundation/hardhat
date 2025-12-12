import path from "path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";

const testFilePath = path.join(".", "contracts", "try-catch", "Coverage.t.sol");

const sourceFilePath = testFilePath.replace(".t", "");

export const COVERAGE_TEST_SCENARIO_TRY_CATCH: CoverageTestScenario = {
  description: "should report coverage for try-catch blocks",
  sourceFilePath,
  testFilePath,
  expectedResult: {
    executedStatementsCount: 10,
    unexecutedStatementsCount: 4,
    lineExecutionCounts: new Map([
      [6, 1],
      [8, 1],
      [9, 0],
      [11, 1],
      [14, 1],
      [15, 0],
      [17, 1],
      [20, 1],
      [21, 1],
      [23, 0],
      [28, 1],
      [33, 1],
      [34, 0],
      [38, 1],
    ]),
    executedLinesCount: 10,
    unexecutedLines: new Set([9, 15, 23, 34]),
  },
};

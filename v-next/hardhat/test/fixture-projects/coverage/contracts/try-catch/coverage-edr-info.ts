import path from "path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";

const testFilePath = path.join(".", "contracts", "try-catch", "Coverage.t.sol");

const sourceFilePath = testFilePath.replace(".t", "");

export const COVERAGE_TEST_SCENARIO_TRY_CATCH: CoverageTestScenario = {
  description: "should report coverage for try-catch blocks",
  sourceFilePath,
  testFilePath,
  expectedResult: {
    executedStatementsCount: 7,
    unexecutedStatementsCount: 2,
    lineExecutionCounts: new Map([
      [6, 1],
      [8, 1],
      [9, 0],
      [11, 1],
      [14, 1],
      [15, 1],
      [17, 0],
      [21, 1],
      [22, 1],
      [25, 1],
      [26, 1],
    ]),
    executedLinesCount: 9,
    unexecutedLines: new Set([9, 17]),
  },
};

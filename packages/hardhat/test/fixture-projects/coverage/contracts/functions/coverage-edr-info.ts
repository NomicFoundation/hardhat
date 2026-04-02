import path from "path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";

const testFilePath = path.join(".", "contracts", "functions", "Coverage.t.sol");

const sourceFilePath = testFilePath.replace(".t", "");

export const COVERAGE_TEST_SCENARIO_FUNCTIONS: CoverageTestScenario = {
  description: "should report coverage for function executions",
  sourceFilePath,
  testFilePath,
  expectedResult: {
    executedStatementsCount: 7,
    unexecutedStatementsCount: 4,
    lineExecutionCounts: new Map([
      [6, 1],
      [8, 1],
      [12, 1],
      [13, 0],
      [16, 1],
      [20, 1],
      [21, 1],
      [24, 0],
      [30, 0],
    ]),
    executedLinesCount: 6,
    unexecutedLines: new Set([13, 24, 30]),
  },
};

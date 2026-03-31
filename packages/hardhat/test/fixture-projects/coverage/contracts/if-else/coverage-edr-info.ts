import path from "path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";

const testFilePath = path.join(".", "contracts", "if-else", "Coverage.t.sol");

const sourceFilePath = testFilePath.replace(".t", "");

export const COVERAGE_TEST_SCENARIO_IF_ELSE: CoverageTestScenario = {
  description: "should report coverage for if-else statements",
  sourceFilePath,
  testFilePath,
  expectedResult: {
    executedStatementsCount: 18,
    unexecutedStatementsCount: 14,
    lineExecutionCounts: new Map([
      [6, 1],
      [8, 1],
      [10, 1],
      [15, 1],
      [19, 1],
      [22, 1],
      [24, 1],
      [26, 1],
      [30, 1],
      [33, 1],
      [35, 1],
      [39, 1],
      [45, 1],
      [12, 0],
      [16, 0],
      [23, 0],
      [25, 0],
      [27, 0],
      [36, 0],
      [42, 0],
    ]),
    executedLinesCount: 13,
    unexecutedLines: new Set([12, 16, 23, 25, 27, 36, 42]),
  },
};

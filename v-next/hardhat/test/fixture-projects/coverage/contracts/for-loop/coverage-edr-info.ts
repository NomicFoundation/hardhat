import path from "node:path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";

const testFilePath = path.join(".", "contracts", "for-loop", "Coverage.t.sol");

const sourceFilePath = testFilePath.replace(".t", "");

export const COVERAGE_TEST_SCENARIO_FOR_LOOP: CoverageTestScenario = {
  description: "should report coverage for for loops",
  sourceFilePath,
  testFilePath,
  expectedResult: {
    executedStatementsCount: 14,
    unexecutedStatementsCount: 3,
    lineExecutionCounts: new Map([
      [6, 1],
      [9, 1],
      [10, 1],
      [14, 1],
      [15, 0],
      [19, 1],
      [20, 1],
      [23, 0],
      [27, 1],
      [28, 1],
      [29, 1],
      [33, 1],
    ]),
    executedLinesCount: 10,
    unexecutedLines: new Set([15, 23]),
  },
};

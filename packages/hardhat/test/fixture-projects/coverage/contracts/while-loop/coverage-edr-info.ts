import path from "path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";

const testFilePath = path.join(
  ".",
  "contracts",
  "while-loop",
  "Coverage.t.sol",
);

const sourceFilePath = testFilePath.replace(".t", "");

export const COVERAGE_TEST_SCENARIO_WHILE_LOOP: CoverageTestScenario = {
  description: "should report coverage for while loops",
  sourceFilePath,
  testFilePath,
  expectedResult: {
    executedStatementsCount: 23,
    unexecutedStatementsCount: 4,
    lineExecutionCounts: new Map([
      [6, 1],
      [9, 1],
      [10, 1],
      [11, 1],
      [12, 1],
      [16, 1],
      [17, 1],
      [18, 0],
      [19, 0],
      [23, 1],
      [24, 1],
      [25, 1],
      [26, 1],
      [29, 0],
      [33, 1],
      [34, 1],
      [35, 1],
      [37, 1],
      [38, 1],
      [39, 1],
      [42, 1],
      [45, 1],
    ]),
    executedLinesCount: 19,
    unexecutedLines: new Set([18, 19, 29]),
  },
};

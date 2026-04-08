import path from "path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";

const testFilePath = path.join(
  ".",
  "contracts",
  "random-formatting",
  "Coverage.t.sol",
);

const sourceFilePath = testFilePath.replace(".t", "");

export const COVERAGE_TEST_SCENARIO_RANDOM_FORMATTING: CoverageTestScenario = {
  description:
    "should report coverage for a if-else statement that is formatted in a random way",
  sourceFilePath,
  testFilePath,
  expectedResult: {
    executedStatementsCount: 19,
    unexecutedStatementsCount: 4,
    lineExecutionCounts: new Map([
      [11, 1],
      [16, 1],
      [19, 0],
      [25, 1],
      [32, 1],
      [33, 1],
      [34, 1],
      [38, 0],
      [44, 1],
      [52, 1],
      [54, 1],
      [56, 1],
      [59, 1],
      [60, 1],
      [62, 1],
      [64, 1],
      [65, 1],
      [68, 1],
      [71, 1],
      [72, 1],
      [74, 1],
      [75, 1],
      [76, 1],
      [85, 1],
      [86, 0],
    ]),
    executedLinesCount: 22,
    unexecutedLines: new Set([19, 38, 86]),
  },
};

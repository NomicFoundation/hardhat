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
    executedStatementsCount: 3,
    unexecutedStatementsCount: 2,
    lineExecutionCounts: new Map([
      [11, 1],
      [14, 0],
      [20, 1],
    ]),
    executedLinesCount: 2,
    unexecutedLines: new Set([14]),
  },
};

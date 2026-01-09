import path from "path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";

const testFilePath = path.join(
  ".",
  "contracts",
  "inline-assembly",
  "Coverage.t.sol",
);

const sourceFilePath = testFilePath.replace(".t", "");

export const COVERAGE_TEST_SCENARIO_INLINE_ASSEMBLY: CoverageTestScenario = {
  description: "should report coverage for inline assembly",
  sourceFilePath,
  testFilePath,
  expectedResult: {
    executedStatementsCount: 1,
    unexecutedStatementsCount: 0,
    lineExecutionCounts: new Map([
      [7, 1],
      [8, 1],
    ]),
    executedLinesCount: 2,
    unexecutedLines: new Set([]),
  },
};

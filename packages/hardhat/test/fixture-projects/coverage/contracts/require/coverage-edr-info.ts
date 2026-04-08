import path from "path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";

const testFilePath = path.join(".", "contracts", "require", "Coverage.t.sol");

const sourceFilePath = testFilePath.replace(".t", "");

export const COVERAGE_TEST_SCENARIO_REQUIRE: CoverageTestScenario = {
  description: "should report coverage for require statements",
  sourceFilePath,
  testFilePath,
  expectedResult: {
    executedStatementsCount: 2,
    unexecutedStatementsCount: 0,
    lineExecutionCounts: new Map([
      [6, 1],
      [8, 1],
    ]),
    executedLinesCount: 2,
    unexecutedLines: new Set([]),
  },
};

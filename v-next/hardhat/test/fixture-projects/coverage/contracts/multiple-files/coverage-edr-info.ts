import path from "path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";
import { FileReport } from "../../../../../src/internal/builtin-plugins/coverage/coverage-manager.js";

const testFilePath1 = path.join(
  ".",
  "contracts",
  "multiple-files",
  "Coverage.t.sol",
);

const sourceFilePath1 = testFilePath1.replace("Coverage.t.sol", "Coverage.sol");
const sourceFilePath2 = testFilePath1.replace(
  "Coverage.t.sol",
  "Coverage-2.sol",
);

export const COVERAGE_TEST_SCENARIO_MULTIPLE_FILES: {
  testFilePath1: string;
  sourceFilePath1: string;
  sourceFilePath2: string;
  expectedResult1: FileReport;
  expectedResult2: FileReport;
} = {
  testFilePath1,
  sourceFilePath1,
  sourceFilePath2,
  expectedResult1: {
    executedStatementsCount: 1,
    unexecutedStatementsCount: 0,
    lineExecutionCounts: new Map([
      [7, 1],
      [8, 1],
    ]),
    executedLinesCount: 2,
    unexecutedLines: new Set([]),
  },
  expectedResult2: {
    executedStatementsCount: 0,
    unexecutedStatementsCount: 1,
    lineExecutionCounts: new Map([
      [7, 0],
      [8, 0],
    ]),
    executedLinesCount: 0,
    unexecutedLines: new Set([7, 8]),
  },
};

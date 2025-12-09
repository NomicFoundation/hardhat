import path from "path";
import { CoverageTestScenario } from "../../../../internal/builtin-plugins/coverage/types.js";

const testFilePath = path.join(
  ".",
  "contracts",
  "do-while-loop",
  "Coverage.t.sol",
);

export const COVERAGE_TEST_SCENARIO_DO_WHILE_LOOP: CoverageTestScenario = {
  description: "should report coverage for do-while loops",
  testFilePath,
  expectedResult: {
    [testFilePath.replace(".t", "")]: {
      executedStatementsCount: 21,
      unexecutedStatementsCount: 1,
      lineExecutionCounts: new Map([
        [6, 1],
        [9, 1],
        [10, 1],
        [11, 1],
        [12, 1],
        [13, 1],
        [16, 1],
        [17, 1],
        [18, 1],
        [19, 1],
        [22, 0],
        [23, 1],
        [26, 1],
        [27, 1],
        [28, 1],
        [30, 1],
        [31, 1],
        [32, 1],
        [33, 1],
        [35, 1],
        [36, 1],
        [38, 1],
      ]),
      executedLinesCount: 21,
      unexecutedLines: new Set([22]),
    },
  },
};

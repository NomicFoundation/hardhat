import type { CoverageTestScenario } from "../types.js";

import { getTestScenarioFileRelativePath } from "../utils.js";

const relativePath = getTestScenarioFileRelativePath("require");

export const COVERAGE_TEST_SCENARIO_REQUIRE: CoverageTestScenario = {
  description: "should report coverage for require statements",
  expectedResult: {
    [relativePath]: {
      executedStatementsCount: 3,
      unexecutedStatementsCount: 1,
      lineExecutionCounts: new Map([
        [6, 1],
        [8, 1],
        [10, 1],
        [12, 0],
      ]),
      executedLinesCount: 3,
      unexecutedLines: new Set([12]),
    },
  },
  // The following variables can be collected by running the code coverage for the Coverage.t.sol test file
  // in this folder against the Coverage.sol source file.
  metadata: [
    {
      relativePath,
      tag: "f0dab0898cf5ec2939766d4025a0046523893fc1612f8031a414fedae5db5aea",
      startUtf16: 141,
      endUtf16: 176,
    },
    {
      relativePath,
      tag: "a5a0ff265fee958357143c584145eed534de0c925146abb89077ba74270ccda7",
      startUtf16: 176,
      endUtf16: 198,
    },
    {
      relativePath,
      tag: "82a2e67ba147cdd1e24c8ae01554352c69260074297ab09c59464c6fe958f697",
      startUtf16: 198,
      endUtf16: 236,
    },
    {
      relativePath,
      tag: "bd1d82ee18610bb22ea3285eda2084e2f84945620b0831141127c18f684b85d7",
      startUtf16: 236,
      endUtf16: 253,
    },
  ],
  data: [
    "f0dab0898cf5ec2939766d4025a0046523893fc1612f8031a414fedae5db5aea",
    "a5a0ff265fee958357143c584145eed534de0c925146abb89077ba74270ccda7",
    "82a2e67ba147cdd1e24c8ae01554352c69260074297ab09c59464c6fe958f697",
    "f0dab0898cf5ec2939766d4025a0046523893fc1612f8031a414fedae5db5aea",
    "a5a0ff265fee958357143c584145eed534de0c925146abb89077ba74270ccda7",
    "82a2e67ba147cdd1e24c8ae01554352c69260074297ab09c59464c6fe958f697",
  ],
};

import type { CoverageTestScenario } from "../types.js";

import { getTestScenarioFileRelativePath } from "../utils.js";

const relativePath = getTestScenarioFileRelativePath("one-liner");

export const COVERAGE_TEST_SCENARIO_ONE_LINER: CoverageTestScenario = {
  description:
    "should report coverage for a if-else statement where only the else branch is executed",
  expectedResult: {
    [relativePath]: {
      executedStatementsCount: 5,
      unexecutedStatementsCount: 6,
      lineExecutionCounts: new Map([
        [11, 0],
        [13, 0],
        [15, 1],
      ]),
      executedLinesCount: 1,
      unexecutedLines: new Set([11, 13]),
    },
  },
  // The following variables can be collected by running the code coverage for the Coverage.t.sol test file
  // in this folder against the Coverage.sol source file.
  metadata: [
    {
      relativePath,
      tag: "53a808635c8ffd8b40bd0274ad402c0c1af6044754a1c399184e95e36a69cb1e",
      startUtf16: 139,
      endUtf16: 308,
    },
    {
      relativePath,
      tag: "8b8e6b5590703a19f62f556ba4cab2f9837bab208f7c92214360e5d79ad802fa",
      startUtf16: 262,
      endUtf16: 276,
    },
    {
      relativePath,
      tag: "ef19ce034c6eea6beecfff75868052281718b8a742e94b2bfe57982f7b942b42",
      startUtf16: 264,
      endUtf16: 274,
    },
    {
      relativePath,
      tag: "175d5e195f3def1cf895f86bac28d4f208b157117a4ddfc52f9d7ae1cc6a5290",
      startUtf16: 281,
      endUtf16: 308,
    },
    {
      relativePath,
      tag: "ba9cb851e270f1f633874f04a92464a611b210b308e8c1a28e0afce8e0935a4d",
      startUtf16: 293,
      endUtf16: 308,
    },
    {
      relativePath,
      tag: "7db9ad9c4909e121c0ba9f070496b2a7fa20d6e20f4f754ef6804802c3dc1632",
      startUtf16: 295,
      endUtf16: 305,
    },
    {
      relativePath,
      tag: "5a92dc1b024b2877639b0f3e64f10c350dff77b78e2a85e70897d3affac8dc25",
      startUtf16: 308,
      endUtf16: 362,
    },
    {
      relativePath,
      tag: "560017eda2dc4220b0be4db97c42078bca0d65f25803f1427aaa5090838d2c52",
      startUtf16: 324,
      endUtf16: 334,
    },
    {
      relativePath,
      tag: "9e94b81d7a4a73f3d1b036eec83665dbe4126d447e4564fba615c46f13fdcc20",
      startUtf16: 339,
      endUtf16: 362,
    },
    {
      relativePath,
      tag: "ead444a32be6e75a1085c62e7727efc7210fc07fe4e7194b234d035499f7751a",
      startUtf16: 351,
      endUtf16: 362,
    },
    {
      relativePath,
      tag: "71996a6dc0bdc194106910ba8006e2870d4fe40fa89f903b3985d52090cf0c60",
      startUtf16: 362,
      endUtf16: 392,
    },
  ],
  data: [
    "175d5e195f3def1cf895f86bac28d4f208b157117a4ddfc52f9d7ae1cc6a5290",
    "53a808635c8ffd8b40bd0274ad402c0c1af6044754a1c399184e95e36a69cb1e",
    "9e94b81d7a4a73f3d1b036eec83665dbe4126d447e4564fba615c46f13fdcc20",
    "71996a6dc0bdc194106910ba8006e2870d4fe40fa89f903b3985d52090cf0c60",
    "5a92dc1b024b2877639b0f3e64f10c350dff77b78e2a85e70897d3affac8dc25",
  ],
};

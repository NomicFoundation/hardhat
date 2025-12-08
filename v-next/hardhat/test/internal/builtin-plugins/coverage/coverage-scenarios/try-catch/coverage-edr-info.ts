import type { CoverageTestScenario } from "../types.js";

import { getTestScenarioFileRelativePath } from "../utils.js";

const relativePath = getTestScenarioFileRelativePath("try-catch");

export const COVERAGE_TEST_SCENARIO_TRY_CATCH: CoverageTestScenario = {
  description: "should report coverage for try-catch blocks",
  expectedResult: {
    [relativePath]: {
      executedStatementsCount: 7,
      unexecutedStatementsCount: 2,
      lineExecutionCounts: new Map([
        [6, 1],
        [8, 1],
        [9, 0],
        [11, 1],
        [14, 1],
        [15, 1],
        [17, 0],
        [21, 1],
        [22, 1],
        [25, 1],
        [26, 1],
      ]),
      executedLinesCount: 9,
      unexecutedLines: new Set([9, 17]),
    },
  },
  // The following variables can be collected by running the code coverage for the Coverage.t.sol test file
  // in this folder against the Coverage.sol source file.
  metadata: [
    {
      relativePath,
      tag: "d33b2dbcd025542ef76347f5f202cfbcb671ed66174fdaa4fad7177371a1f30b",
      startUtf16: 141,
      endUtf16: 161,
    },
    {
      relativePath,
      tag: "d4be6ab795fb87542b7ad9cc01a89542f2316a4cc7e19b7a69daab798e472436",
      startUtf16: 161,
      endUtf16: 270,
    },
    {
      relativePath,
      tag: "80121166c6284ec03ce3bf0c1ddd22e93bc35b86bd84ff5994fbbf9aadea6d4c",
      startUtf16: 211,
      endUtf16: 232,
    },
    {
      relativePath,
      tag: "4d39c92b2c3075dad665fdd0fdeb629e010ecddd364b4ef4e8acd658d0c97f13",
      startUtf16: 246,
      endUtf16: 264,
    },
    {
      relativePath,
      tag: "56b935dca9a7575504770bc2d733b10db8bff860ea607a5225afcf972675f193",
      startUtf16: 270,
      endUtf16: 395,
    },
    {
      relativePath,
      tag: "4134a92a35de4242a8fdf439ac6b5379baf2e253cd2e402574868d89498ef5d3",
      startUtf16: 317,
      endUtf16: 338,
    },
    {
      relativePath,
      tag: "0abcd75aa8a4768d13436e95d25125afd40d75c37ad3b704d6d195b4d59a2bc7",
      startUtf16: 373,
      endUtf16: 389,
    },
    {
      relativePath,
      tag: "25d608b93e3244eb256ebdc10e99d8aa4db2b5d577e6754533c01247e5757973",
      startUtf16: 467,
      endUtf16: 502,
    },
    {
      relativePath,
      tag: "ad4ce3e76bc4ef9b392babab31d08c5fa042c7678ed448184e646985541541f7",
      startUtf16: 571,
      endUtf16: 589,
    },
  ],
  data: [
    "ad4ce3e76bc4ef9b392babab31d08c5fa042c7678ed448184e646985541541f7",
    "4134a92a35de4242a8fdf439ac6b5379baf2e253cd2e402574868d89498ef5d3",
    "d4be6ab795fb87542b7ad9cc01a89542f2316a4cc7e19b7a69daab798e472436",
    "25d608b93e3244eb256ebdc10e99d8aa4db2b5d577e6754533c01247e5757973",
    "56b935dca9a7575504770bc2d733b10db8bff860ea607a5225afcf972675f193",
    "4d39c92b2c3075dad665fdd0fdeb629e010ecddd364b4ef4e8acd658d0c97f13",
    "d33b2dbcd025542ef76347f5f202cfbcb671ed66174fdaa4fad7177371a1f30b",
  ],
};

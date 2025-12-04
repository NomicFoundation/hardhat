import type { CoverageTestScenario } from "../types.js";

import { getTestScenarioFileRelativePath } from "../utils.js";

const relativePath = getTestScenarioFileRelativePath("for-loop");

export const COVERAGE_TEST_SCENARIO_FOR_LOOP: CoverageTestScenario = {
  description: "should report coverage for for loops",
  expectedResult: {
    [relativePath]: {
      executedStatementsCount: 14,
      unexecutedStatementsCount: 3,
      lineExecutionCounts: new Map([
        [6, 1],
        [9, 1],
        [10, 1],
        [14, 1],
        [15, 0],
        [19, 1],
        [20, 1],
        [23, 0],
        [27, 1],
        [28, 1],
        [29, 1],
        [33, 1],
      ]),
      executedLinesCount: 10,
      unexecutedLines: new Set([15, 23]),
    },
  },
  // The following variables can be collected by running the code coverage for the Coverage.t.sol test file
  // in this folder against the Coverage.sol source file.
  metadata: [
    {
      relativePath,
      tag: "e67393f5257784f0af690c1a9d2012f05f4dc3cbc8003bb0cbc9a6dce6cc74a2",
      startUtf16: 141,
      endUtf16: 162,
    },
    {
      relativePath,
      tag: "92e33e672babaab8ff38eeb3450cd599365cce4b63d88214bd24d6916460406b",
      startUtf16: 162,
      endUtf16: 270,
    },
    {
      relativePath,
      tag: "984d3147cae75b5352dfb3885be4a2d7ef0df3d97763b1c19a8d2fc9e5be17f4",
      startUtf16: 245,
      endUtf16: 270,
    },
    {
      relativePath,
      tag: "2e5fcb636c5d50ed24b7b3b14e28ddad3263ebfc421d11b393b579d9419c2451",
      startUtf16: 248,
      endUtf16: 264,
    },
    {
      relativePath,
      tag: "41e7c040ef83880fd905f3f082f725aa6d08963901f8433bc15ea29a05baca59",
      startUtf16: 270,
      endUtf16: 429,
    },
    {
      relativePath,
      tag: "085aaece57ac8057b302a562a63dbcbd236b642ba7946d089ba2720ffd3698a6",
      startUtf16: 404,
      endUtf16: 429,
    },
    {
      relativePath,
      tag: "ae7071328a8d5360da42a95810d0008bf98f8c9b2d456f81a71729a922418583",
      startUtf16: 407,
      endUtf16: 423,
    },
    {
      relativePath,
      tag: "3b075e091d63b1dd499c52ebbafc50bd8f452f505db727535b9f7369d76d5b3f",
      startUtf16: 429,
      endUtf16: 590,
    },
    {
      relativePath,
      tag: "0c4f4360210764a235fdae5bf0032ee29fd43955066723de1185d0279bcb2427",
      startUtf16: 521,
      endUtf16: 590,
    },
    {
      relativePath,
      tag: "ad2649e36a2f381335eb190d1248507c6ab0341789e65c356ab1a483cdac285c",
      startUtf16: 524,
      endUtf16: 540,
    },
    {
      relativePath,
      tag: "a3f75421f0033dc8abad2e5daa7d07395fdbfac0db55634006a53632ab1986de",
      startUtf16: 540,
      endUtf16: 584,
    },
    {
      relativePath,
      tag: "e1d9f660f8051b70a06a65a91991d78073e24552abc38565b3f026bd33763c5a",
      startUtf16: 590,
      endUtf16: 741,
    },
    {
      relativePath,
      tag: "6f319d751167ef69a7c2baf4dcd6720541ab143efbcc60d56151f2d88020d9b7",
      startUtf16: 666,
      endUtf16: 741,
    },
    {
      relativePath,
      tag: "eb6df9d55c9c1e36817bb45ccdce52003508340a6a44debe41a93887f441065c",
      startUtf16: 669,
      endUtf16: 735,
    },
    {
      relativePath,
      tag: "51e330784687ed913bcc3dbbf7c4ab6f781884dda0e58949679973615c939fde",
      startUtf16: 706,
      endUtf16: 735,
    },
    {
      relativePath,
      tag: "0fcf636e95fcbbdf689e122758c476ecd8eb9b5bc49c4b028bff0ee4235eb8f7",
      startUtf16: 709,
      endUtf16: 727,
    },
    {
      relativePath,
      tag: "a037540f8ba9f7ad40d4b86397c7a8449faa949f43edf3eb83d7fe343b3d18a2",
      startUtf16: 741,
      endUtf16: 758,
    },
  ],
  data: [
    "984d3147cae75b5352dfb3885be4a2d7ef0df3d97763b1c19a8d2fc9e5be17f4",
    "ad2649e36a2f381335eb190d1248507c6ab0341789e65c356ab1a483cdac285c",
    "e67393f5257784f0af690c1a9d2012f05f4dc3cbc8003bb0cbc9a6dce6cc74a2",
    "92e33e672babaab8ff38eeb3450cd599365cce4b63d88214bd24d6916460406b",
    "e1d9f660f8051b70a06a65a91991d78073e24552abc38565b3f026bd33763c5a",
    "6f319d751167ef69a7c2baf4dcd6720541ab143efbcc60d56151f2d88020d9b7",
    "eb6df9d55c9c1e36817bb45ccdce52003508340a6a44debe41a93887f441065c",
    "0fcf636e95fcbbdf689e122758c476ecd8eb9b5bc49c4b028bff0ee4235eb8f7",
    "2e5fcb636c5d50ed24b7b3b14e28ddad3263ebfc421d11b393b579d9419c2451",
    "a037540f8ba9f7ad40d4b86397c7a8449faa949f43edf3eb83d7fe343b3d18a2",
    "51e330784687ed913bcc3dbbf7c4ab6f781884dda0e58949679973615c939fde",
    "41e7c040ef83880fd905f3f082f725aa6d08963901f8433bc15ea29a05baca59",
    "3b075e091d63b1dd499c52ebbafc50bd8f452f505db727535b9f7369d76d5b3f",
    "0c4f4360210764a235fdae5bf0032ee29fd43955066723de1185d0279bcb2427",
  ],
};

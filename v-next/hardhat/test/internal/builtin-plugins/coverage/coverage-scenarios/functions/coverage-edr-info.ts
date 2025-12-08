import type { CoverageTestScenario } from "../types.js";

import { getTestScenarioFileRelativePath } from "../utils.js";

const relativePath = getTestScenarioFileRelativePath("functions");

export const COVERAGE_TEST_SCENARIO_FUNCTIONS: CoverageTestScenario = {
  description: "should report coverage for function executions",
  expectedResult: {
    [relativePath]: {
      executedStatementsCount: 7,
      unexecutedStatementsCount: 3,
      lineExecutionCounts: new Map([
        [6, 1],
        [8, 1],
        [11, 1],
        [12, 1],
        [13, 0],
        [16, 1],
        [19, 1],
        [20, 1],
        [21, 1],
        [24, 0],
      ]),
      executedLinesCount: 8,
      unexecutedLines: new Set([13, 24]),
    },
  },
  // The following variables can be collected by running the code coverage for the Coverage.t.sol test file
  // in this folder against the Coverage.sol source file.
  metadata: [
    {
      relativePath,
      tag: "f4343caad0fb1e92dd55656b635672b0e52d76f3bd7d90500a3ac795316e1b03",
      startUtf16: 123,
      endUtf16: 142,
    },
    {
      relativePath,
      tag: "b566ef628dde2d5018fd8f4af8488222e6a5b5605c43e6dfb6f442232956aa44",
      startUtf16: 142,
      endUtf16: 162,
    },
    {
      relativePath,
      tag: "23eca40d71b1599a412ab39b843265795ac968cabf4a580d1ba6839acbdb4aa4",
      startUtf16: 214,
      endUtf16: 254,
    },
    {
      relativePath,
      tag: "d3df3cdcd403ded25df5aa6ef48786cd4b0e105d872185f1622b1e9be91071ed",
      startUtf16: 231,
      endUtf16: 254,
    },
    {
      relativePath,
      tag: "94acfc3f18e443a082deba47e363c33781ba5a32ba4404de1dcd3e6429c27986",
      startUtf16: 234,
      endUtf16: 248,
    },
    {
      relativePath,
      tag: "b543223537743414daffe6e39d6338b85047092d9229826b88877c01f20dd316",
      startUtf16: 254,
      endUtf16: 267,
    },
    {
      relativePath,
      tag: "2db1bb1b8f936cf2872686210879c033b80056b0173687803dc300880e78f125",
      startUtf16: 319,
      endUtf16: 357,
    },
    {
      relativePath,
      tag: "2d3d8d07032a543d85482a0853b3292b399951c383f546095d54649e153da013",
      startUtf16: 334,
      endUtf16: 357,
    },
    {
      relativePath,
      tag: "74171bb9a793831b7d469189a1102352ac457ccd29a296b327d0aa8bdbc34ec2",
      startUtf16: 337,
      endUtf16: 351,
    },
    {
      relativePath,
      tag: "e6a5f1eb43e808dcf7205892e22bd4220c105466992aa4de3cf000f3ce3e9b0c",
      startUtf16: 357,
      endUtf16: 370,
    },
  ],
  data: [
    "b543223537743414daffe6e39d6338b85047092d9229826b88877c01f20dd316",
    "f4343caad0fb1e92dd55656b635672b0e52d76f3bd7d90500a3ac795316e1b03",
    "2d3d8d07032a543d85482a0853b3292b399951c383f546095d54649e153da013",
    "2db1bb1b8f936cf2872686210879c033b80056b0173687803dc300880e78f125",
    "74171bb9a793831b7d469189a1102352ac457ccd29a296b327d0aa8bdbc34ec2",
    "23eca40d71b1599a412ab39b843265795ac968cabf4a580d1ba6839acbdb4aa4",
    "b566ef628dde2d5018fd8f4af8488222e6a5b5605c43e6dfb6f442232956aa44",
  ],
};

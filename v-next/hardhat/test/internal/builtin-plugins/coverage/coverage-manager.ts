import type { CoverageTestScenario } from "./types.js";
import type { Report } from "../../../../src/internal/builtin-plugins/coverage/coverage-manager.js";
import type {
  CoverageData,
  CoverageMetadata,
} from "../../../../src/internal/builtin-plugins/coverage/types.js";
import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";

import assert from "node:assert/strict";
import path from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

import {
  disableConsole,
  useFixtureProject,
  useTmpDir,
} from "@nomicfoundation/hardhat-test-utils";
import { getAllFilesMatching } from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import { CoverageManagerImplementation } from "../../../../src/internal/builtin-plugins/coverage/coverage-manager.js";
import { COVERAGE_TEST_SCENARIO_DO_WHILE_LOOP } from "../../../fixture-projects/coverage/contracts/do-while-loop/coverage-edr-info.js";

describe("CoverageManagerImplementation", () => {
  const id = "test";
  const metadata: CoverageMetadata = [
    {
      relativePath: "contracts/test.sol",
      tag: "a",
      startUtf16: 1,
      endUtf16: 3,
    },
    {
      relativePath: "contracts/test.sol",
      tag: "b",
      startUtf16: 5,
      endUtf16: 5,
    },
    {
      relativePath: "contracts/test.sol",
      tag: "c",
      startUtf16: 5,
      endUtf16: 6,
    },
    {
      relativePath: "contracts/test.sol",
      tag: "d",
      startUtf16: 1,
      endUtf16: 2,
    },
    {
      relativePath: "contracts/other.sol",
      tag: "e",
      startUtf16: 1,
      endUtf16: 2,
    },
  ];
  const data: CoverageData = ["a", "b", "d", "a", "a", "d"];
  const report: Report = {
    "contracts/test.sol": {
      lineExecutionCounts: new Map([
        [1, 5],
        [2, 5],
        [3, 3],
        [5, 1],
        [6, 0],
      ]),
      executedStatementsCount: 3,
      unexecutedStatementsCount: 1,

      executedLinesCount: 4,
      unexecutedLines: new Set([6]),
    },
    "contracts/other.sol": {
      lineExecutionCounts: new Map([
        [1, 0],
        [2, 0],
      ]),
      executedLinesCount: 0,

      executedStatementsCount: 0,
      unexecutedStatementsCount: 2,
      unexecutedLines: new Set([1, 2]),
    },
  };

  let coverageManager: CoverageManagerImplementation;

  useTmpDir();
  disableConsole();

  beforeEach(async () => {
    coverageManager = new CoverageManagerImplementation(process.cwd());
  });

  it("should load all the saved data", async () => {
    const data1: CoverageData = ["a", "b", "c"];
    const data2: CoverageData = ["1", "2", "3"];

    const allMetadata: CoverageMetadata = [];

    for (const item of [...data1, ...data2]) {
      allMetadata.push({
        relativePath: "contracts/test.sol",
        tag: item,
        startUtf16: 1,
        endUtf16: 1,
      });
    }

    await coverageManager.addMetadata(allMetadata);

    const coverageManager1 = new CoverageManagerImplementation(process.cwd());
    const coverageManager2 = new CoverageManagerImplementation(process.cwd());

    await coverageManager1.addData(data1);
    await coverageManager1.saveData(id);

    await coverageManager2.addData(data2);
    await coverageManager2.saveData(id);

    await coverageManager.loadData(id);

    const allData = coverageManager.data;

    for (const item of [...data1, ...data2]) {
      assert.ok(
        allData.includes(item),
        `The loaded data should include ${item}`,
      );
    }
  });

  /**
   * This test was introduced in response to:
   * https://github.com/NomicFoundation/hardhat/issues/7385
   *
   * The underlying issue was that with enough coverage entries
   * we were getting issues with conversion to function params,
   * hence the large array size: `150_000`.
   *
   * This test should be monitored for performance in our CI.
   */
  it("should load large save data files", async () => {
    const data1: CoverageData = Array.from({ length: 150_000 }, (_, i) =>
      (i + 1).toString(),
    );

    const allMetadata: CoverageMetadata = [];

    for (const item of [...data1]) {
      allMetadata.push({
        relativePath: "contracts/test.sol",
        tag: item,
        startUtf16: 1,
        endUtf16: 1,
      });
    }

    const coverageManager1 = new CoverageManagerImplementation(process.cwd());
    await coverageManager1.addData(data1);
    await coverageManager1.saveData(id);

    await coverageManager.loadData(id);
    const allData = coverageManager.data;

    for (const item of [...data1]) {
      assert.ok(
        allData.includes(item),
        `The loaded data should include ${item}`,
      );
    }
  });

  it("should store all the metadata", async () => {
    const metadata1: CoverageMetadata = [
      {
        relativePath: "contracts/test1.sol",
        tag: "test1",
        startUtf16: 1,
        endUtf16: 1,
      },
    ];
    const metadata2: CoverageMetadata = [
      {
        relativePath: "contracts/test2.sol",
        tag: "test2",
        startUtf16: 1,
        endUtf16: 1,
      },
    ];

    await coverageManager.addMetadata(metadata1);
    await coverageManager.addMetadata(metadata2);

    const allMetadata = coverageManager.metadata;

    for (const item of [...metadata1, ...metadata2]) {
      assert.ok(
        allMetadata.some((i) => i.tag === item.tag),
        `The loaded metadata should include ${item.tag}`,
      );
    }
  });

  it("should clear the data from memory", async () => {
    await coverageManager.addData(data);

    let allData = coverageManager.data;

    assert.ok(allData.length !== 0, "The data should be saved to memory");

    await coverageManager.clearData(id);

    allData = coverageManager.data;

    assert.ok(allData.length === 0, "The data should be cleared from memory");
  });

  it("should clear the data from disk", async () => {
    await coverageManager.addData(data);
    await coverageManager.saveData(id);

    let allData = await getAllFilesMatching(process.cwd());

    assert.ok(allData.length !== 0, "The data should be saved to disk");

    await coverageManager.clearData(id);

    allData = await getAllFilesMatching(process.cwd());

    assert.ok(allData.length === 0, "The data should be cleared from disk");
  });

  it("should not clear the metadata", async () => {
    await coverageManager.addMetadata(metadata);

    let allMetadata = coverageManager.metadata;

    assert.ok(
      allMetadata.length !== 0,
      "The metadata should be saved to memory",
    );

    await coverageManager.clearData(id);

    allMetadata = coverageManager.metadata;

    assert.ok(
      allMetadata.length !== 0,
      "The metadata should not be cleared from memory",
    );
  });

  it("should format the lcov report", async () => {
    const actual = coverageManager.formatLcovReport(report);
    const expected = [
      "TN:",
      "SF:contracts/test.sol",
      "DA:1,5",
      "DA:2,5",
      "DA:3,3",
      "DA:5,1",
      "DA:6,0",
      "LH:4",
      "LF:5",
      "end_of_record",
      "SF:contracts/other.sol",
      "DA:1,0",
      "DA:2,0",
      "LH:0",
      "LF:2",
      "end_of_record",
      "",
    ].join("\n");
    assert.equal(actual, expected);
  });

  it("should format the markdown report", async () => {
    const actual = coverageManager.formatMarkdownReport(report);

    const expected = [
      `| ${chalk.bold("Coverage Report")}     |        |             |                 |`,
      "| ------------------- | ------ | ----------- | --------------- |",
      `| ${chalk.yellow("File Path")}           | ${chalk.yellow("Line %")} | ${chalk.yellow("Statement %")} | ${chalk.yellow("Uncovered Lines")} |`,
      "| contracts/test.sol  | 80.00  | 75.00       | 6               |",
      "| contracts/other.sol | 0.00   | 0.00        | 1-2             |",
      "| ------------------- | ------ | ----------- | --------------- |",
      `| ${chalk.yellow("Total")}               | 57.14  | 50.00       |                 |`,
    ].join("\n");

    assert.equal(actual, expected);
  });

  const expectedRelativePath: Array<[string, string]> = [
    ["", ""],
    ["test.sol", "test.sol"],
    ["contracts/test.sol", "contracts/test.sol"],
    [
      "a/very/very/very/very/long/path/that/should/be/truncated/to/fit/in/the/table/test.sol",
      "…/very/very/very/long/path/that/should/be/truncated/to/fit/in/the/table/test.sol",
    ],
  ];

  for (const [relativePath, expected] of expectedRelativePath) {
    it(`should format the relative path (${relativePath})`, async () => {
      const actual = coverageManager.formatRelativePath(
        relativePath.replaceAll("/", path.sep),
      );
      assert.equal(actual, expected.replaceAll("/", path.sep));
    });
  }

  const expectedCoverage: Array<[number, string]> = [
    [0, "0.00"],
    [12.5, "12.50"],
    [20.75, "20.75"],
    [33.333, "33.33"],
    [66.666, "66.67"],
    [100, "100.00"],
  ];

  for (const [coverage, expected] of expectedCoverage) {
    it(`should format the coverage (${coverage})`, async () => {
      const actual = coverageManager.formatCoverage(coverage);
      assert.equal(actual, expected);
    });
  }

  const expectedLines: Array<[Set<number>, string]> = [
    [new Set(), "-"],
    [new Set([1, 2, 3]), "1-3"],
    [new Set([1, 2, 3, 5, 7, 8, 9]), "1-3, 5, 7-9"],
    [new Set([1, 3, 5]), "1, 3, 5"],
    [
      new Set([
        1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28,
        29, 31, 32, 34, 35, 37, 38, 40, 41,
      ]),
      "1-2, 4-5, 7-8, 10-11, 13-14, 16-17, 19-20, 22-23, 25-26, 28-29, 31-32, 34-35,…",
    ],
  ];

  for (const [lines, expected] of expectedLines) {
    it(`should format the lines (${Array.from(lines).join(", ")})`, async () => {
      const actual = coverageManager.formatLines(lines);
      assert.equal(actual, expected);
    });
  }
});

describe("CoverageManagerImplementation - report data processing", () => {
  //
  // The following tests use fixture projects to validate coverage report generation.
  // For each scenario, there is a .sol file containing a specific feature (e.g. if/else condition, while loop, etc.)
  // and a .t.sol test file that verifies that feature.
  // The result of the coverage processing is compared against the expected output defined in the same directory
  // where these Solidity files are located.
  //
  const testScenrarios: CoverageTestScenario[] = [
    COVERAGE_TEST_SCENARIO_DO_WHILE_LOOP,
  ];

  const coverageManagerTmp = new CoverageManagerImplementation("");
  let hre: HardhatRuntimeEnvironment;
  let originalCoverageFlag: boolean;

  useFixtureProject("coverage");

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({});

    originalCoverageFlag = hre.globalOptions.coverage;

    hre.globalOptions.coverage = true;

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- For the test we need to access to the hidden _coverage property */
    (hre as any)._coverage = coverageManagerTmp;
  });

  after(() => {
    hre.globalOptions.coverage = originalCoverageFlag;
  });

  for (const testScenrario of testScenrarios) {
    it(testScenrario.description, async () => {
      await hre.tasks.getTask(["test", "solidity"]).run({
        noCompile: false,
        testFiles: [testScenrario.testFilePath],
      });

      const res = await coverageManagerTmp.getReport();

      assert.deepEqual(res, testScenrario.expectedResult);
    });
  }
});

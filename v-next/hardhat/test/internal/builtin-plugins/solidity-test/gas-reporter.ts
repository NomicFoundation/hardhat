import type { Report } from "../../../../src/internal/builtin-plugins/solidity-test/gas-reporter.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TestStatus, type SuiteResult } from "@nomicfoundation/edr";

import {
  formatJsonReport,
  formatMarkdownReport,
  formatSnapshotReport,
  getReport,
  kindToGasUsage,
} from "../../../../src/internal/builtin-plugins/solidity-test/gas-reporter.js";
import { tagColorizer } from "../../utils/colorizer.js";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

describe("Gas Reporter", () => {
  const partialSuiteResults: Array<DeepPartial<SuiteResult>> = [
    {
      id: {
        name: "TestContract",
        source: "project/test/contracts/WithForge.sol",
      },
      testResults: [
        {
          name: "testExpectArithmetic()",
          status: TestStatus.Success,
          kind: {
            consumedGas: BigInt(9899),
          },
        },
      ],
    },
    {
      id: {
        name: "FailingCounterTest",
        source: "project/contracts/Counter.t.sol",
      },
      testResults: [
        {
          name: "invariant()",
          status: TestStatus.Failure,
          kind: {
            runs: BigInt(0),
            calls: BigInt(0),
            reverts: BigInt(0),
          },
        },
        {
          name: "testFailFuzzInc(uint8)",
          status: TestStatus.Success,
          kind: {
            runs: BigInt(256),
            meanGas: BigInt(87206),
            medianGas: BigInt(44608),
          },
        },
        {
          name: "testFuzzInc(uint8)",
          status: TestStatus.Failure,
          kind: {
            runs: BigInt(0),
            meanGas: BigInt(0),
            medianGas: BigInt(0),
          },
        },
        {
          name: "testInitialValue()",
          status: TestStatus.Failure,
          kind: {
            consumedGas: BigInt(11331),
          },
        },
      ],
    },
    {
      id: {
        name: "CounterTest",
        source: "project/contracts/Counter.t.sol",
      },
      testResults: [
        {
          name: "invariant()",
          status: TestStatus.Success,
          kind: {
            runs: BigInt(256),
            calls: BigInt(128000),
            reverts: BigInt(0),
          },
        },
        {
          name: "testFailFuzzInc(uint8)",
          status: TestStatus.Failure,
          kind: {
            runs: BigInt(0),
            meanGas: BigInt(0),
            medianGas: BigInt(0),
          },
        },
        {
          name: "testFailInitialValue()",
          status: TestStatus.Failure,
          kind: {
            consumedGas: BigInt(11309),
          },
        },
        {
          name: "testFuzzInc(uint8)",
          status: TestStatus.Success,
          kind: {
            runs: BigInt(256),
            meanGas: BigInt(98747),
            medianGas: BigInt(61658),
          },
        },
        {
          name: "testInitialValue()",
          status: TestStatus.Success,
          kind: {
            consumedGas: BigInt(11077),
          },
        },
      ],
    },
  ];
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- In the tests, we want to be able to use partial suite results as actual suite results to avoid having to specify all the suite result fields
  const suiteResults = partialSuiteResults as SuiteResult[];

  const report: Report = {
    TestContract: {
      gasUsageByFunctionName: {
        "testExpectArithmetic()": {
          kind: "StandardTestKind",
          consumedGas: BigInt(9899),
        },
      },
    },
    FailingCounterTest: {
      gasUsageByFunctionName: {
        "invariant()": {
          kind: "InvariantTestKind",
          runs: BigInt(0),
          calls: BigInt(0),
          reverts: BigInt(0),
        },
        "testFailFuzzInc(uint8)": {
          kind: "FuzzTestKind",
          runs: BigInt(256),
          meanGas: BigInt(87206),
          medianGas: BigInt(44608),
        },
        "testFuzzInc(uint8)": {
          kind: "FuzzTestKind",
          runs: BigInt(0),
          meanGas: BigInt(0),
          medianGas: BigInt(0),
        },
        "testInitialValue()": {
          kind: "StandardTestKind",
          consumedGas: BigInt(11331),
        },
      },
    },
    CounterTest: {
      gasUsageByFunctionName: {
        "invariant()": {
          kind: "InvariantTestKind",
          runs: BigInt(256),
          calls: BigInt(128000),
          reverts: BigInt(0),
        },
        "testFailFuzzInc(uint8)": {
          kind: "FuzzTestKind",
          runs: BigInt(0),
          meanGas: BigInt(0),
          medianGas: BigInt(0),
        },
        "testFailInitialValue()": {
          kind: "StandardTestKind",
          consumedGas: BigInt(11309),
        },
        "testFuzzInc(uint8)": {
          kind: "FuzzTestKind",
          runs: BigInt(256),
          meanGas: BigInt(98747),
          medianGas: BigInt(61658),
        },
        "testInitialValue()": {
          kind: "StandardTestKind",
          consumedGas: BigInt(11077),
        },
      },
    },
  };

  describe("kindToGasUsage", () => {
    const testCases = [
      {
        name: "StandardTestKind",
        kind: {
          consumedGas: BigInt(0),
        },
      },
      {
        name: "FuzzTestKind",
        kind: {
          runs: BigInt(0),
          medianGas: BigInt(0),
          meanGas: BigInt(0),
        },
      },
      {
        name: "InvariantTestKind",
        kind: {
          runs: BigInt(0),
          calls: BigInt(0),
          reverts: BigInt(0),
        },
      },
    ];

    for (const { name, kind } of testCases) {
      it(`should parse ${name} kind`, () => {
        const expected = {
          kind: name,
          ...kind,
        };
        const actual = kindToGasUsage(kind);
        assert.deepEqual(actual, expected);
      });
    }
  });

  describe("getReport", () => {
    it("should parse suite results", () => {
      const actual = getReport(suiteResults);
      const expected = report;

      assert.deepEqual(actual, expected);
    });
  });

  describe("formatJsonReport", () => {
    it("should format the report as a JSON report", () => {
      const actual = formatJsonReport(report);
      const expected = `{
  "TestContract": {
    "gasUsageByFunctionName": {
      "testExpectArithmetic()": {
        "kind": "StandardTestKind",
        "consumedGas": "9899"
      }
    }
  },
  "FailingCounterTest": {
    "gasUsageByFunctionName": {
      "invariant()": {
        "kind": "InvariantTestKind",
        "runs": "0",
        "calls": "0",
        "reverts": "0"
      },
      "testFailFuzzInc(uint8)": {
        "kind": "FuzzTestKind",
        "runs": "256",
        "meanGas": "87206",
        "medianGas": "44608"
      },
      "testFuzzInc(uint8)": {
        "kind": "FuzzTestKind",
        "runs": "0",
        "meanGas": "0",
        "medianGas": "0"
      },
      "testInitialValue()": {
        "kind": "StandardTestKind",
        "consumedGas": "11331"
      }
    }
  },
  "CounterTest": {
    "gasUsageByFunctionName": {
      "invariant()": {
        "kind": "InvariantTestKind",
        "runs": "256",
        "calls": "128000",
        "reverts": "0"
      },
      "testFailFuzzInc(uint8)": {
        "kind": "FuzzTestKind",
        "runs": "0",
        "meanGas": "0",
        "medianGas": "0"
      },
      "testFailInitialValue()": {
        "kind": "StandardTestKind",
        "consumedGas": "11309"
      },
      "testFuzzInc(uint8)": {
        "kind": "FuzzTestKind",
        "runs": "256",
        "meanGas": "98747",
        "medianGas": "61658"
      },
      "testInitialValue()": {
        "kind": "StandardTestKind",
        "consumedGas": "11077"
      }
    }
  }
}`;

      assert.equal(actual, expected);
    });
  });

  describe("formatSnapshotReport", () => {
    it("should format the report as a snapshot report", () => {
      const actual = formatSnapshotReport(report);
      const expected = `TestContract::testExpectArithmetic() (gas: 9899)
FailingCounterTest::testFailFuzzInc(uint8) (runs: 256, μ: 87206, ~: 44608)
FailingCounterTest::testFuzzInc(uint8) (runs: 0, μ: 0, ~: 0)
FailingCounterTest::testInitialValue() (gas: 11331)
CounterTest::testFailFuzzInc(uint8) (runs: 0, μ: 0, ~: 0)
CounterTest::testFailInitialValue() (gas: 11309)
CounterTest::testFuzzInc(uint8) (runs: 256, μ: 98747, ~: 61658)
CounterTest::testInitialValue() (gas: 11077)`;

      assert.equal(actual, expected);
    });
  });

  describe("formatMarkdownReport", () => {
    it("should format the report as a markdown table", () => {
      const actual = formatMarkdownReport(report, tagColorizer);
      const expected = `| <bold>Contract / Function Name 📄</bold> | <bold>Median Gas ⛽️</bold> | <bold>Mean Gas ⛽️</bold> | <bold>Runs 👟</bold> |
| ---------------------------------------- | -------------------------- | ------------------------ | -------------------- |
| <bold>TestContract</bold>                |                            |                          |                      |
| testExpectArithmetic()                   | 9899                       | 9899                     | 1                    |
| <bold>FailingCounterTest</bold>          |                            |                          |                      |
| testFailFuzzInc(uint8)                   | 44608                      | 87206                    | 256                  |
| testFuzzInc(uint8)                       | 0                          | 0                        | 0                    |
| testInitialValue()                       | 11331                      | 11331                    | 1                    |
| <bold>CounterTest</bold>                 |                            |                          |                      |
| testFailFuzzInc(uint8)                   | 0                          | 0                        | 0                    |
| testFailInitialValue()                   | 11309                      | 11309                    | 1                    |
| testFuzzInc(uint8)                       | 61658                      | 98747                    | 256                  |
| testInitialValue()                       | 11077                      | 11077                    | 1                    |`;

      assert.equal(actual, expected);
    });
  });
});

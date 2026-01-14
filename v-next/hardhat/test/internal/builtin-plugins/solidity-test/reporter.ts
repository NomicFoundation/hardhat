import type { TestEvent } from "../../../../src/internal/builtin-plugins/solidity-test/types.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CallKind,
  TestStatus,
  type CallTrace,
  type TestResult,
} from "@nomicfoundation/edr";

import { testReporter } from "../../../../src/internal/builtin-plugins/solidity-test/reporter.js";

function arrayAsAsyncGenerator<T>(array: T[]): AsyncGenerator<T, void> {
  return (async function* () {
    for (const item of array) {
      yield item;
    }
  })();
}

const noopColorizer = {
  blue: (text: string) => text,
  green: (text: string) => text,
  red: (text: string) => text,
  yellow: (text: string) => text,
  cyan: (text: string) => text,
  grey: (text: string) => text,
  dim: (text: string) => text,
};

const tagColorizer = {
  blue: (text: string) => `<blue>${text}</blue>`,
  green: (text: string) => `<green>${text}</green>`,
  red: (text: string) => `<red>${text}</red>`,
  yellow: (text: string) => `<yellow>${text}</yellow>`,
  cyan: (text: string) => `<cyan>${text}</cyan>`,
  grey: (text: string) => `<grey>${text}</grey>`,
  dim: (text: string) => `<dim>${text}</dim>`,
};

async function arrayifiedTestReporter(
  arraySource: TestEvent[],
  verbosity: number,
  colorizer = noopColorizer,
): Promise<string[]> {
  const source = arrayAsAsyncGenerator(arraySource);
  const result: string[] = [];
  const reporter = testReporter(source, new Map(), verbosity, 0, colorizer);
  for await (const message of reporter) {
    if (typeof message === "string") {
      result.push(message);
    }
  }
  return result;
}

interface MockTrace {
  contract: string;
  gasUsed: bigint;
  children?: MockTrace[];
}

interface MockSuite {
  source: string;
  name: string;
  warnings?: string[];
  results: Array<{
    name: string;
    status: TestStatus;
    consoleLogs?: string[];
    duration?: bigint;
    traces?: MockTrace[];
  }>;
}

const mocker = {
  tests(mockSuites: MockSuite[]): TestEvent[] {
    return mockSuites.map(
      (mockSuite) =>
        ({
          type: "suite:done",
          data: {
            id: {
              source: mockSuite.source,
              name: mockSuite.name,
              solcVersion: "0.8.0",
            },
            durationNs: 10n,
            warnings: mockSuite.warnings ?? [],
            testResults: (mockSuite.results ?? [])
              .map(
                (result) =>
                  ({
                    name: result.name,
                    status: result.status,
                    decodedLogs: result.consoleLogs ?? [],
                    durationNs: result.duration ?? 10n,
                    kind: { consumedGas: 12345n },
                    stackTrace: () => null,
                    callTraces: () => {
                      return (result.traces ?? []).map((trace) =>
                        mocker.trace(trace),
                      );
                    },
                  }) satisfies TestResult,
              )
              .reverse(),
          },
        }) satisfies TestEvent,
    );
  },
  trace(trace: MockTrace): CallTrace {
    return {
      kind: CallKind.Call,
      success: true,
      isCheatcode: false,
      gasUsed: trace.gasUsed,
      value: 0n,
      address: "0x7c926CE5743033Cbe6f6cF7D6622EF70e05503A6",
      contract: trace.contract,
      inputs: new Uint8Array(),
      outputs: new Uint8Array(),
      children: (trace.children ?? []).map((child) => mocker.trace(child)),
    };
  },
};

describe("testReporter", () => {
  describe("no colors", () => {
    it("single suite, 1 success", async () => {
      const result = await arrayifiedTestReporter(
        mocker.tests([
          {
            source: "TestSuite.sol",
            name: "TestSuite",
            results: [
              {
                name: "successful test",
                status: TestStatus.Success,
              },
            ],
          },
        ]),
        3,
      );

      const expectedOutput = `
  TestSuite.sol:TestSuite
    ✔ successful test


  1 passing
`.replace("\n", ""); // the first newline is only here to make the expected output more readable

      assert.deepEqual(result.join(""), expectedOutput);
    });

    it("single suite, 1 failure", async () => {
      const result = await arrayifiedTestReporter(
        mocker.tests([
          {
            source: "TestSuite.sol",
            name: "TestSuite",
            results: [
              {
                name: "failing test",
                status: TestStatus.Failure,
                consoleLogs: ["debug log"],
                traces: [
                  { contract: "Foo", gasUsed: 100n },
                  {
                    contract: "Bar",
                    gasUsed: 90n,
                    children: [{ contract: "Baz", gasUsed: 80n }],
                  },
                ],
              },
            ],
          },
        ]),
        3,
      );

      const expectedOutput = `
  TestSuite.sol:TestSuite
debug log
    1) failing test
      Call Traces:
        [100] Foo
        [90] Bar
          └─ [80] Baz


  0 passing
  1 failing

  TestSuite.sol:TestSuite
    1) failing test
      Error: Unknown error
`.replace("\n", ""); // the first newline is only here to make the expected output more readable

      assert.deepEqual(result.join(""), expectedOutput);
    });

    it("single suite, 1 skipped", async () => {
      const result = await arrayifiedTestReporter(
        mocker.tests([
          {
            source: "TestSuite.sol",
            name: "TestSuite",
            results: [
              {
                name: "skipped test",
                status: TestStatus.Skipped,
              },
            ],
          },
        ]),
        3,
      );

      const expectedOutput = `
  TestSuite.sol:TestSuite
    - skipped test


  0 passing
  1 skipped
`.replace("\n", ""); // the first newline is only here to make the expected output more readable

      assert.deepEqual(result.join(""), expectedOutput);
    });

    it("single suite, 1 skipped, 1 failing, 1 success", async () => {
      const result = await arrayifiedTestReporter(
        mocker.tests([
          {
            source: "TestSuite.sol",
            name: "TestSuite",
            results: [
              {
                name: "skipped test",
                status: TestStatus.Skipped,
              },
              {
                name: "failing test",
                status: TestStatus.Failure,
                consoleLogs: ["debug log"],
                traces: [
                  { contract: "Foo", gasUsed: 100n },
                  {
                    contract: "Bar",
                    gasUsed: 90n,
                    children: [{ contract: "Baz", gasUsed: 80n }],
                  },
                ],
              },
              {
                name: "successful test",
                status: TestStatus.Success,
              },
            ],
          },
        ]),
        3,
      );

      const expectedOutput = `
  TestSuite.sol:TestSuite
    - skipped test
debug log
    1) failing test
      Call Traces:
        [100] Foo
        [90] Bar
          └─ [80] Baz

    ✔ successful test


  1 passing
  1 failing
  1 skipped

  TestSuite.sol:TestSuite
    1) failing test
      Error: Unknown error
`.replace("\n", ""); // the first newline is only here to make the expected output more readable

      assert.deepEqual(result.join(""), expectedOutput);
    });

    it("suite has a warning", async () => {
      const result = await arrayifiedTestReporter(
        mocker.tests([
          {
            source: "TestSuite.sol",
            name: "TestSuite",
            warnings: ["This is a warning"],
            results: [
              {
                name: "successful test",
                status: TestStatus.Success,
              },
            ],
          },
        ]),
        3,
      );

      const expectedOutput = `
  TestSuite.sol:TestSuite
    Warning: This is a warning

    ✔ successful test


  1 passing
`.replace("\n", ""); // the first newline is only here to make the expected output more readable

      assert.deepEqual(result.join(""), expectedOutput);
    });

    it("two suites", async () => {
      const result = await arrayifiedTestReporter(
        mocker.tests([
          {
            source: "TestSuite.sol",
            name: "TestSuite",
            results: [
              {
                name: "successful test",
                status: TestStatus.Success,
              },
            ],
          },
          {
            source: "TestSuite.sol",
            name: "AnotherTestSuite",
            results: [
              {
                name: "another successful test",
                status: TestStatus.Success,
              },
            ],
          },
        ]),
        3,
      );

      const expectedOutput = `
  TestSuite.sol:TestSuite
    ✔ successful test

  TestSuite.sol:AnotherTestSuite
    ✔ another successful test


  2 passing
`.replace("\n", ""); // the first newline is only here to make the expected output more readable

      assert.deepEqual(result.join(""), expectedOutput);
    });

    it("two suites with two failures each", async () => {
      const result = await arrayifiedTestReporter(
        mocker.tests([
          {
            source: "TestSuite.sol",
            name: "TestSuite1",
            results: [
              {
                name: "failing test1",
                status: TestStatus.Failure,
              },
              {
                name: "failing test2",
                status: TestStatus.Failure,
              },
            ],
          },
          {
            source: "TestSuite.sol",
            name: "TestSuite2",
            results: [
              {
                name: "failing test3",
                status: TestStatus.Failure,
              },
              {
                name: "failing test4",
                status: TestStatus.Failure,
              },
            ],
          },
        ]),
        3,
      );

      const expectedOutput = `
  TestSuite.sol:TestSuite1
    1) failing test1
    2) failing test2

  TestSuite.sol:TestSuite2
    3) failing test3
    4) failing test4


  0 passing
  4 failing

  TestSuite.sol:TestSuite1
    1) failing test1
      Error: Unknown error

    2) failing test2
      Error: Unknown error

  TestSuite.sol:TestSuite2
    3) failing test3
      Error: Unknown error

    4) failing test4
      Error: Unknown error
`.replace("\n", ""); // the first newline is only here to make the expected output more readable

      assert.deepEqual(result.join(""), expectedOutput);
    });
  });

  describe("colors", () => {
    it("single suite, 1 skipped, 1 failing, 1 success", async () => {
      const result = await arrayifiedTestReporter(
        mocker.tests([
          {
            source: "TestSuite.sol",
            name: "TestSuite",
            results: [
              {
                name: "skipped test",
                status: TestStatus.Skipped,
              },
              {
                name: "failing test",
                status: TestStatus.Failure,
                consoleLogs: ["debug log"],
                traces: [
                  { contract: "Foo", gasUsed: 100n },
                  {
                    contract: "Bar",
                    gasUsed: 90n,
                    children: [{ contract: "Baz", gasUsed: 80n }],
                  },
                ],
              },
              {
                name: "successful test",
                status: TestStatus.Success,
              },
            ],
          },
        ]),
        3,
        tagColorizer,
      );

      const expectedOutput = `
  TestSuite.sol:TestSuite
    <cyan>- skipped test</cyan>
debug log
    <red>1) failing test</red>
      Call Traces:
        [100] <green>Foo</green>
        [90] <green>Bar</green>
          └─ [80] <green>Baz</green>

    <green>✔</green> successful test


  <green>1 passing</green>
  <red>1 failing</red>
  <cyan>1 skipped</cyan>

  TestSuite.sol:TestSuite
    1) failing test
      <red>Error: Unknown error</red>
`.replace("\n", ""); // the first newline is only here to make the expected output more readable

      assert.deepEqual(result.join(""), expectedOutput);
    });
  });
});

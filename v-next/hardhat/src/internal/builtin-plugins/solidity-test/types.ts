import type { SolidityTestResult, SuiteResult } from "@nomicfoundation/edr";
import type { Readable } from "node:stream";

export type TestStatus = "Success" | "Failure" | "Skipped";

export type TestsStream = Readable;

export type TestEvent =
  | {
      type: "suite:done";
      data: SuiteResult;
    }
  | {
      type: "run:done";
      data: SolidityTestResult;
    };

export type TestEventSource = AsyncGenerator<TestEvent, void>;
export type TestReporterResult = AsyncGenerator<
  | string
  | {
      failed: number;
      passed: number;
      skipped: number;
      failureOutput: string;
    },
  void
>;

export type TestReporter = (source: TestEventSource) => TestReporterResult;

import type { SuiteResult } from "@ignored/edr";
import type { Readable } from "node:stream";

export interface RunOptions {
  /**
   * The maximum time in milliseconds to wait for all the test suites to finish.
   */
  timeout?: number;
}

export type TestStatus = "Success" | "Failure" | "Skipped";

export type TestsStream = Readable;

// NOTE: The interface can be turned into a type and extended with more event types as needed.
export interface TestEvent {
  type: "suite:result";
  data: SuiteResult;
}

export type TestEventSource = AsyncGenerator<TestEvent, void>;
export type TestReporterResult = AsyncGenerator<string, void>;

export type TestReporter = (source: TestEventSource) => TestReporterResult;

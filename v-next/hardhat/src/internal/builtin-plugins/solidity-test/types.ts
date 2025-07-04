import type { SuiteResult } from "@ignored/edr-optimism";
import type { Readable } from "node:stream";

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

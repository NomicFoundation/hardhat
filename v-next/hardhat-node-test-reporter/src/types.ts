import type { TestEvent } from "node:test/reporters";

/**
 * A map from event type to its data type.
 */
export type TestEventData = UnionToObject<TestEvent>;

type UnionToObject<T extends { type: string }> = {
  [K in T as K["type"]]: K extends { type: K["type"]; data: infer D }
    ? D
    : never;
};

/**
 * The type of the event source that the reporter will receive.
 */
export type TestEventSource = AsyncGenerator<TestEvent, void>;

/**
 * The type of the result of the reporter.
 */
export type TestReporterResult = AsyncGenerator<string, void>;

/**
 * The type of the reporter.
 */
export type TestReporter = (source: TestEventSource) => TestReporterResult;

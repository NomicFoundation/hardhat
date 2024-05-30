import type { TestEvent } from "node:test/reporters";

/**
 * This is missing from `@types/node` 20, so we define our own version of it,
 * based on the Node 22 docs.
 */
export interface TestCompletedEventData {
  column?: number;
  details: {
    passed: boolean;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    duration_ms: number;
    error?: Error;
    type?: string;
  };
  file?: string;
  line?: number;
  name: string;
  nesting: number;
  testNumber: number;
  todo?: string | boolean;
  skip?: string | boolean;
}

/**
 * This is missing from `@types/node` 20, so we define our own version of it,
 * based on the Node 22 docs.
 */
export interface TestCoverageEventData {
  summary: {
    files: Array<{
      path: string;
      totalLineCount: number;
      totalBranchCount: number;
      totalFunctionCount: number;
      coveredLineCount: number;
      coveredBranchCount: number;
      coveredFunctionCount: number;
      coveredLinePercent: number;
      coveredBranchPercent: number;
      coveredFunctionPercent: number;
      functions: Array<{
        name: string;
        line: number;
        count: number;
      }>;
      branches: Array<{
        line: number;
        count: number;
      }>;
      lines: Array<{
        line: number;
        count: number;
      }>;
    }>;
    totals: {
      totalLineCount: number;
      totalBranchCount: number;
      totalFunctionCount: number;
      coveredLineCount: number;
      coveredBranchCount: number;
      coveredFunctionCount: number;
      coveredLinePercent: number;
      coveredBranchPercent: number;
      coveredFunctionPercent: number;
    };
    workingDirectory: string;
  };
  nesting: number;
}

/**
 * This is a fixed version of `@types/node`, as that one is incomplete, at least
 * in its version 20.
 */
export type CorrectedTestEvent =
  | TestEvent
  | { type: "test:complete"; data: TestCompletedEventData }
  | { type: "test:coverage"; data: TestCoverageEventData };

/**
 * A map from event type to its data type.
 */
export type TestEventData = UnionToObject<CorrectedTestEvent>;

type UnionToObject<T extends { type: string }> = {
  [K in T as K["type"]]: K extends { type: K["type"]; data: infer D }
    ? D
    : never;
};

/**
 * The type of the event source that the reporter will receive.
 */
export type TestEventSource = AsyncGenerator<CorrectedTestEvent, void>;

/**
 * The type of the result of the reporter.
 */
export type TestReporterResult = AsyncGenerator<string, void>;

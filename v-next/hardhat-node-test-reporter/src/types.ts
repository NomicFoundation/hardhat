import type { TestEvent } from "node:test/reporters";

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

// We define this type because @types/node@20 doesn't define it
export type CorrectedTestEvent =
  | TestEvent
  | { type: "test:complete"; data: TestCompletedEventData }
  | { type: "test:coverage"; data: TestCoverageEventData };

// We map the event type to their data type so that its easier to work with
export type TestEventData = UnionToObject<CorrectedTestEvent>;

type UnionToObject<T extends { type: string }> = {
  [K in T as K["type"]]: K extends { type: K["type"]; data: infer D }
    ? D
    : never;
};

export type TestEventSource = AsyncGenerator<CorrectedTestEvent, void>;

export type TestReporterResult = AsyncGenerator<string, void>;

export interface Failure {
  index: number;
  testFail: TestEventData["test:fail"];
  contextStack: Array<TestEventData["test:start"]>;
}

import type { TestRunOptions } from "./types.js";
import type { TestEvent } from "node:test/reporters";

export function getTestRunOptions(): TestRunOptions {
  const only = process.execArgv.includes("--test-only");
  return { only };
}

export function isTopLevelFilePassEvent(event: TestEvent): boolean {
  return (
    event.type === "test:pass" &&
    event.data.nesting === 0 &&
    event.data.line === 1 &&
    event.data.column === 1
  );
}

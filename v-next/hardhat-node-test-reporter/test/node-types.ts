import type { TestEvent } from "node:test/reporters";

import { describe, it } from "node:test";

describe("Missing @types/node definitions", () => {
  it("Should miss test:coverage from TestEvent", () => {
    const testCoverageEventIsNotTyped: "test:coverage" extends TestEvent["type"]
      ? true
      : false = false;
    void testCoverageEventIsNotTyped;
  });

  it("Should miss test:completed from TestEvent", () => {
    const testCompletedEventIsNotTyped: "test:completed" extends TestEvent["type"]
      ? true
      : false = false;
    void testCompletedEventIsNotTyped;
  });
});

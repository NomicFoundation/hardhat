import type { TestContext } from "node:test";

import v8 from "node:v8";

// Captured before any test mocks it.
const getRealHeapStatistics = v8.getHeapStatistics;

/**
 * The ways the JSON functions can run, with the available heap that makes
 * them take each one. Tests set it explicitly for both, so that the path
 * doesn't depend on the machine running them.
 */
export const JSON_PATHS: ReadonlyArray<{
  name: "buffered" | "streamed";
  availableHeap: number;
}> = [
  { name: "buffered", availableHeap: Number.MAX_SAFE_INTEGER },
  { name: "streamed", availableHeap: 0 },
];

/**
 * Makes `v8.getHeapStatistics()` report `bytes` of available heap until the
 * end of the test.
 */
export function mockAvailableHeap(t: TestContext, bytes: number): void {
  t.mock.method(v8, "getHeapStatistics", () => ({
    ...getRealHeapStatistics(),
    total_available_size: bytes,
  }));
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AsyncMutex } from "../../../../src/internal/core/async-mutex.js";

describe("AsyncMutex", () => {
  it("should run a function exclusively", async () => {
    const mutex = new AsyncMutex();

    let running = 0;
    let maxRunning = 0;

    async function run() {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running--;
    }

    await Promise.all([
      mutex.exclusiveRun(run),
      mutex.exclusiveRun(run),
      mutex.exclusiveRun(run),
    ]);

    assert.equal(maxRunning, 1);
    assert.equal(running, 0);
  });
});

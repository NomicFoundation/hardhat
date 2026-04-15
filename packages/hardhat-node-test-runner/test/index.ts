import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { runHardhatTest } from "./helpers/run-hardhat.js";

// The `test nodejs` task sets `HH_TEST=true` and defaults `NODE_ENV=test`
// before invoking `node:test`'s `run()`. Historically these assertions were
// made in-process by calling the task directly from inside the test, but the
// task now runs test files with `isolation: "none"` (same-process execution
// for perf/consistency). That means calling the task from a process that is
// itself already a `node --test` session nests `node:test` within
// `node:test`, which hangs on Node 24 and errors on Node 22.
//
// Instead, each scenario below spawns a fresh Hardhat CLI against a fixture
// project whose own test file makes the assertions. A non-zero exit from the
// child means the inner assertions failed; we surface stdout/stderr so CI
// logs stay actionable.

const FIXTURES_DIR = fileURLToPath(
  new URL("./fixture-projects", import.meta.url),
);

describe("Hardhat Node plugin", () => {
  it("sets HH_TEST=true and defaults NODE_ENV to 'test' when it was unset", async () => {
    const { exitCode, stdout, stderr } = await runHardhatTest(
      path.join(FIXTURES_DIR, "env-assertions-unset"),
      // Explicitly clear NODE_ENV so the child starts without it. The parent
      // process may have NODE_ENV set (e.g. tsx sets it, or the outer
      // `node --test` harness sets it) — we mustn't let that leak through
      // and short-circuit the `??=` in the task.
      { NODE_ENV: undefined },
    );

    assert.equal(
      exitCode,
      0,
      `hardhat test nodejs failed (exit ${String(exitCode)}):\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`,
    );
  });

  it("does not overwrite NODE_ENV when it is already defined", async () => {
    const { exitCode, stdout, stderr } = await runHardhatTest(
      path.join(FIXTURES_DIR, "env-assertions-preserve"),
      { NODE_ENV: "HELLO" },
    );

    assert.equal(
      exitCode,
      0,
      `hardhat test nodejs failed (exit ${String(exitCode)}):\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`,
    );
  });
});

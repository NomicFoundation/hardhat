import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";

import { overrideTask } from "hardhat/config";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import HardhatNodeTestRunnerPlugin from "../src/index.js";

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

  describe("grep filtering", () => {
    it("runs only the tests whose name matches --grep", async () => {
      // The fixture defines `keep_alpha` (passes) and `drop_beta` (throws if it
      // runs). With `--grep keep_alpha`, only `keep_alpha` should run, so the
      // CLI must exit 0. If the filter were ignored, `drop_beta` would also run
      // and fail, and the CLI would exit non-zero.
      const { exitCode, stdout, stderr } = await runHardhatTest(
        path.join(FIXTURES_DIR, "grep-filtering"),
        {},
        ["--grep", "keep_alpha"],
      );

      assert.equal(
        exitCode,
        0,
        `expected only 'keep_alpha' to run under '--grep keep_alpha', but the run failed (exit ${String(exitCode)}) — 'drop_beta' was likely not filtered out:\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`,
      );

      // Guard against the filter matching *nothing*: if `keep_alpha` were also
      // filtered out, zero tests would run and the CLI would still exit 0,
      // making the exit-code check above a false positive. Assert that at least
      // one test actually ran and passed.
      assert.match(
        stripVTControlCharacters(stdout + stderr),
        /\b[1-9]\d* passing\b/,
        `expected at least one test ('keep_alpha') to run under '--grep keep_alpha', but the reporter showed none passing:\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`,
      );
    });
  });

  describe("build invocation", () => {
    // These tests only check that the `build` task is called with the
    // right `noTests` argument. They don't need to actually run any tests.
    //
    // We use an empty fixture project (no test files inside its `test/`
    // folder) so the `test nodejs` task exits early after running `build`,
    // without trying to run any tests itself.
    //
    // If we let it try to run tests, two things would go wrong:
    //   1. We're already inside a `node --test` run, and the task would
    //      call `node:test` again in the same process — that hangs
    //   2. Without this fixture, the task would look for tests in this
    //      package's own `test/` folder and end up running the fixture
    //      files in `test/fixture-projects/`, some of which only work
    //      under very specific env vars.
    const buildInvocationProjectRoot = path.join(
      FIXTURES_DIR,
      "build-invocation",
    );

    function buildArgCaptor() {
      const buildArgs: any[] = [];
      const buildOverride = overrideTask("build")
        .setAction(async () => {
          return {
            default: (args: any) => {
              buildArgs.push(args);
              return { contractRootPaths: [], testRootPaths: [] };
            },
          };
        })
        .build();
      return { buildArgs, buildOverride };
    }

    it("should call build without noTests when splitTestsCompilation is false", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment(
        {
          plugins: [HardhatNodeTestRunnerPlugin],
          tasks: [buildOverride],
        },
        {},
        buildInvocationProjectRoot,
      );

      await hre.tasks.getTask(["test", "nodejs"]).run({});

      assert.equal(buildArgs.length, 1);
      assert.equal(buildArgs[0].noTests, false);
    });

    it("should call build with noTests when splitTestsCompilation is true", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment(
        {
          solidity: {
            version: "0.8.28",
            splitTestsCompilation: true,
          },
          plugins: [HardhatNodeTestRunnerPlugin],
          tasks: [buildOverride],
        },
        {},
        buildInvocationProjectRoot,
      );

      await hre.tasks.getTask(["test", "nodejs"]).run({});

      assert.equal(buildArgs.length, 1);
      assert.equal(buildArgs[0].noTests, true);
    });

    it("should skip compilation when noCompile is true without splitTestsCompilation", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment(
        {
          plugins: [HardhatNodeTestRunnerPlugin],
          tasks: [buildOverride],
        },
        {},
        buildInvocationProjectRoot,
      );

      await hre.tasks.getTask(["test", "nodejs"]).run({ noCompile: true });

      assert.equal(buildArgs.length, 0);
    });

    it("should skip compilation when noCompile is true with splitTestsCompilation", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createHardhatRuntimeEnvironment(
        {
          solidity: {
            version: "0.8.28",
            splitTestsCompilation: true,
          },
          plugins: [HardhatNodeTestRunnerPlugin],
          tasks: [buildOverride],
        },
        {},
        buildInvocationProjectRoot,
      );

      await hre.tasks.getTask(["test", "nodejs"]).run({ noCompile: true });

      assert.equal(buildArgs.length, 0);
    });
  });
});

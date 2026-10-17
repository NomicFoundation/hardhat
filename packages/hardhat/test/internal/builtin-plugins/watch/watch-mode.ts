import type { HardhatPlugin } from "../../../../src/types/plugins.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  createTmpDir,
} from "@nomicfoundation/hardhat-test-utils";
import { mkdir, writeUtf8File } from "@nomicfoundation/hardhat-utils/fs";

import {
  getWatchedPaths,
  isTestFile,
  runWatchMode,
} from "../../../../src/internal/builtin-plugins/watch/watch-mode.js";
import { createHardhatRuntimeEnvironment } from "../../../../src/internal/hre-initialization.js";

/**
 * A test runner plugin that, like the Node.js runner, accepts every file that
 * no other runner takes.
 */
const catchAllRunnerPlugin: HardhatPlugin = {
  id: "test:catch-all-runner",
  hookHandlers: {
    test: async () => ({
      default: async () => ({
        registerFileForTestRunner: async (context, filePath, next) => {
          const runner = await next(context, filePath);
          return runner ?? "catch-all";
        },
      }),
    }),
  },
};

async function createProject(root: string) {
  // The project root is the closest directory with a package.json
  await writeUtf8File(path.join(root, "package.json"), "{}");
  await mkdir(path.join(root, "contracts"));
  await mkdir(path.join(root, "test"));
  await writeUtf8File(path.join(root, "contracts", "A.sol"), "");
  await writeUtf8File(path.join(root, "contracts", "A.t.sol"), "");
  await writeUtf8File(path.join(root, "test", "B.t.sol"), "");
  await writeUtf8File(path.join(root, "test", "c.ts"), "");
  await writeUtf8File(path.join(root, "hardhat.config.ts"), "");
}

describe("watch/watch-mode", () => {
  const tmp = createTmpDir("watch-mode", "test");

  describe("getWatchedPaths", () => {
    it("watches only the Solidity tests for test solidity", async () => {
      await createProject(tmp.path);
      await mkdir(path.join(tmp.path, "test-ts"));
      const hre = await createHardhatRuntimeEnvironment(
        {
          paths: { tests: { solidity: "test" } },
        },
        {},
        tmp.path,
      );

      const watched = await getWatchedPaths(hre, "test solidity");

      assert.ok(
        watched.includes(path.join(tmp.path, "test")),
        'Expected watched.includes(path.join(tmp.path, "test"))',
      );
      assert.ok(
        watched.includes(path.join(tmp.path, "contracts")),
        'Expected watched.includes(path.join(tmp.path, "contracts"))',
      );
    });

    it("watches the sources, the tests and the config for test", async () => {
      await createProject(tmp.path);
      const hre = await createHardhatRuntimeEnvironment(
        { paths: { tests: { solidity: "test" } } },
        {},
        tmp.path,
      );

      const watched = await getWatchedPaths(hre, "test");

      assert.ok(
        watched.includes(path.join(tmp.path, "contracts")),
        'Expected watched.includes(path.join(tmp.path, "contracts"))',
      );
      assert.ok(
        watched.includes(path.join(tmp.path, "test")),
        'Expected watched.includes(path.join(tmp.path, "test"))',
      );
    });

    it("doesn't watch paths that don't exist", async () => {
      await createProject(tmp.path);
      const hre = await createHardhatRuntimeEnvironment(
        { paths: { tests: { solidity: "missing" } } },
        {},
        tmp.path,
      );

      const watched = await getWatchedPaths(hre, "build");

      assert.deepEqual(watched, [path.join(tmp.path, "contracts")]);
    });
  });

  describe("isTestFile", () => {
    it("recognizes Solidity tests in the tests directory and among the sources", async () => {
      await createProject(tmp.path);
      const hre = await createHardhatRuntimeEnvironment(
        { paths: { tests: { solidity: "test" } } },
        {},
        tmp.path,
      );

      assert.equal(
        await isTestFile(hre, path.join(tmp.path, "test", "B.t.sol")),
        true,
      );
      assert.equal(
        await isTestFile(hre, path.join(tmp.path, "contracts", "A.t.sol")),
        true,
      );
      assert.equal(
        await isTestFile(hre, path.join(tmp.path, "contracts", "A.sol")),
        false,
      );
    });

    it("doesn't count files outside the test directories that a catch-all runner accepts", async () => {
      await createProject(tmp.path);
      const hre = await createHardhatRuntimeEnvironment(
        {
          plugins: [catchAllRunnerPlugin],
          paths: { tests: { solidity: "test" } },
        },
        {},
        tmp.path,
      );

      assert.equal(
        await isTestFile(hre, path.join(tmp.path, "hardhat.config.ts")),
        false,
      );
      assert.equal(
        await isTestFile(hre, path.join(tmp.path, "test", "c.ts")),
        true,
      );
    });

    it("only counts the given runner's files when asked", async () => {
      await createProject(tmp.path);
      const hre = await createHardhatRuntimeEnvironment(
        {
          plugins: [catchAllRunnerPlugin],
          paths: { tests: { solidity: "test" } },
        },
        {},
        tmp.path,
      );

      assert.equal(
        await isTestFile(hre, path.join(tmp.path, "test", "c.ts"), "solidity"),
        false,
      );
      assert.equal(
        await isTestFile(
          hre,
          path.join(tmp.path, "test", "B.t.sol"),
          "solidity",
        ),
        true,
      );
    });
  });

  describe("runWatchMode", () => {
    it("throws when the command line doesn't enable watch mode", async () => {
      await createProject(tmp.path);
      const hre = await createHardhatRuntimeEnvironment({}, {}, tmp.path);

      await assertRejectsWithHardhatError(
        runWatchMode({
          hre,
          task: "test",
          watchDelay: 50,
          noRestart: false,
          selectTestFiles: true,
          rawArguments: ["test"],
        }),
        HardhatError.ERRORS.CORE.BUILTIN_TASKS.WATCH_MODE_REQUIRES_CLI,
        { task: "test" },
      );
    });
  });

  describe("task overrides", () => {
    it("rejects watch mode when the task is run from code", async () => {
      await createProject(tmp.path);
      const hre = await createHardhatRuntimeEnvironment({}, {}, tmp.path);

      // The test runner's command line has no --watch flag
      await assertRejectsWithHardhatError(
        hre.tasks.getTask("build").run({ watch: true }),
        HardhatError.ERRORS.CORE.BUILTIN_TASKS.WATCH_MODE_REQUIRES_CLI,
        { task: "build" },
      );
    });

    it("adds the watch arguments to build and test", async () => {
      await createProject(tmp.path);
      const hre = await createHardhatRuntimeEnvironment({}, {}, tmp.path);

      const build = hre.tasks.getTask("build");
      const test = hre.tasks.getTask("test");

      assert.equal(build.options.get("watch")?.shortName, "w");
      assert.equal(build.options.get("watchDelay")?.defaultValue, 50);
      assert.ok(
        build.options.has("noRestart"),
        'Expected build.options.has("noRestart")',
      );
      assert.equal(test.options.get("watch")?.shortName, "w");
      assert.ok(
        test.options.has("runAll"),
        'Expected test.options.has("runAll")',
      );

      const testSolidity = hre.tasks.getTask(["test", "solidity"]);
      assert.equal(testSolidity.options.get("watch")?.shortName, "w");
      assert.ok(
        testSolidity.options.has("runAll"),
        'Expected testSolidity.options.has("runAll")',
      );
    });
  });
});

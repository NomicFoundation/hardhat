import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";
import type { HardhatPlugin } from "../../../../src/types/plugins.js";

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { overrideTask, task } from "../../../../src/config.js";
import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import { getGasAnalyticsManager } from "../../../../src/internal/builtin-plugins/gas-analytics/helpers/accessors.js";
import { ArgumentType } from "../../../../src/types/arguments.js";
import { successfulResult, errorResult } from "../../../../src/utils/result.js";

// Override the builtin solidity subtask to be a no-op
const solidityNoOp = overrideTask(["test", "solidity"])
  .setInlineAction(async () => undefined)
  .build();

function mockRunner(name: string, action: (...args: any[]) => unknown) {
  return task(["test", name])
    .addVariadicArgument({
      name: "testFiles",
      description: "Test files",
      defaultValue: [],
    })
    .addOption({
      name: "grep",
      description: "Only run tests matching the given string or regexp",
      type: ArgumentType.STRING_WITHOUT_DEFAULT,
      defaultValue: undefined,
    })
    .addFlag({ name: "noCompile" })
    .setInlineAction(action)
    .build();
}

describe("test/task-action", function () {
  afterEach(function () {
    process.exitCode = undefined;
  });

  describe("subtask returning Result<TestRunResult, TestRunResult>", function () {
    it("should return a successful result when the subtask returns a successful Result", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () =>
            successfulResult({
              summary: { passed: 3, failed: 0, skipped: 0, todo: 0 },
            }),
          ),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: true, value: undefined });
    });

    it("should return an error result when the subtask returns a failed Result", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () =>
            errorResult({
              summary: { passed: 1, failed: 2, skipped: 0, todo: 0 },
            }),
          ),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: false, error: undefined });
    });
  });

  describe("subtask returning Result<TestSummary, TestSummary> (backwards compat)", function () {
    it("should return a successful result when the subtask returns a successful Result", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () =>
            successfulResult({ passed: 3, failed: 0, skipped: 0, todo: 0 }),
          ),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: true, value: undefined });
    });

    it("should return an error result when the subtask returns a failed Result", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () =>
            errorResult({ passed: 1, failed: 2, skipped: 0, todo: 0 }),
          ),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: false, error: undefined });
    });
  });

  describe("subtask returning a plain TestSummary (backwards compat)", function () {
    it("should return a successful result when the subtask returns a plain TestSummary and exitCode is not set", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () => ({
            passed: 5,
            failed: 0,
            skipped: 0,
            todo: 0,
          })),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: true, value: undefined });
    });

    it("should return an error result when the subtask returns a plain TestSummary and exitCode is 1", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () => {
            process.exitCode = 1;
            return { passed: 1, failed: 3, skipped: 0, todo: 0 };
          }),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: false, error: undefined });
    });
  });

  describe("subtask returning undefined with process.exitCode (backwards compat)", function () {
    it("should return an error result when the subtask returns undefined and exitCode is 1", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () => {
            process.exitCode = 1;
          }),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: false, error: undefined });
    });
  });

  describe("subtask returning a partial TestSummary (backwards compat)", function () {
    it("should return a successful result when the subtask returns only failed and passed", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () => ({
            passed: 3,
            failed: 0,
          })),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: true, value: undefined });
    });

    it("should return an error result when the subtask returns a partial TestSummary and exitCode is 1", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () => {
            process.exitCode = 1;
            return { passed: 1, failed: 2 };
          }),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: false, error: undefined });
    });
  });

  describe("mixed subtask return types", function () {
    it("should return an error result when a Result subtask succeeds but a plain summary subtask fails", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () =>
            successfulResult({ passed: 3, failed: 0, skipped: 0, todo: 0 }),
          ),
          mockRunner("runner-b", () => {
            process.exitCode = 1;
            return { passed: 2, failed: 1, skipped: 0, todo: 0 };
          }),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: false, error: undefined });
    });

    it("should return a successful result when all subtasks succeed with different return styles", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () =>
            successfulResult({ passed: 3, failed: 0, skipped: 0, todo: 0 }),
          ),
          mockRunner("runner-b", () => ({
            passed: 2,
            failed: 0,
            skipped: 0,
            todo: 0,
          })),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: true, value: undefined });
    });

    it("should return an error result when a Result subtask succeeds but another subtask only sets exitCode", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () =>
            successfulResult({ passed: 3, failed: 0, skipped: 0, todo: 0 }),
          ),
          mockRunner("runner-b", () => {
            process.exitCode = 1;
          }),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: false, error: undefined });
    });

    it("should return an error result when a TestRunResult subtask succeeds but a plain summary subtask fails", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () =>
            successfulResult({
              summary: { passed: 3, failed: 0, skipped: 0, todo: 0 },
            }),
          ),
          mockRunner("runner-b", () => {
            process.exitCode = 1;
            return { passed: 2, failed: 1, skipped: 0, todo: 0 };
          }),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: false, error: undefined });
    });

    it("should return a successful result when TestRunResult and TestSummary Result subtasks both succeed", async () => {
      const hre = await createHardhatRuntimeEnvironment({
        tasks: [
          solidityNoOp,
          mockRunner("runner-a", () =>
            successfulResult({
              summary: { passed: 3, failed: 0, skipped: 0, todo: 0 },
            }),
          ),
          mockRunner("runner-b", () =>
            successfulResult({ passed: 2, failed: 0, skipped: 0, todo: 0 }),
          ),
        ],
      });

      const result = await hre.tasks.getTask("test").run({ noCompile: true });

      assert.deepEqual(result, { success: true, value: undefined });
    });
  });

  describe("build invocation", function () {
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

    async function createTestHre(
      buildOverride: ReturnType<typeof buildArgCaptor>["buildOverride"],
      splitTestsCompilation: boolean,
    ): Promise<HardhatRuntimeEnvironment> {
      return createHardhatRuntimeEnvironment({
        ...(splitTestsCompilation
          ? {
              solidity: {
                version: "0.8.28",
                splitTestsCompilation: true,
              },
            }
          : {}),
        tasks: [
          solidityNoOp,
          buildOverride,
          mockRunner("runner-a", () =>
            successfulResult({
              summary: { passed: 1, failed: 0, skipped: 0, todo: 0 },
            }),
          ),
        ],
      });
    }

    it("should call build without noTests when splitTestsCompilation is false", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createTestHre(buildOverride, false);

      await hre.tasks.getTask("test").run({ noCompile: false });

      assert.equal(buildArgs.length, 1);
      assert.equal(buildArgs[0].noTests, false);
    });

    it("should call build with noTests when splitTestsCompilation is true", async () => {
      const { buildArgs, buildOverride } = buildArgCaptor();
      const hre = await createTestHre(buildOverride, true);

      await hre.tasks.getTask("test").run({ noCompile: false });

      assert.equal(buildArgs.length, 1);
      assert.equal(buildArgs[0].noTests, true);
    });
  });

  describe("gas stats reporting only includes data from subtasks that ran", function () {
    it("should not include stale data from a skipped runner in the gas stats report", async (t) => {
      const consoleMock = t.mock.method(console, "log", () => {});

      // Plugin that maps "runner-a-test.ts" → "runner-a", leaving "runner-b" unregistered
      const fileMapperPlugin: HardhatPlugin = {
        id: "test-file-mapper",
        hookHandlers: {
          test: async () => ({
            default: async () => ({
              registerFileForTestRunner: async (context, filePath, next) => {
                if (filePath === "runner-a-test.ts") return "runner-a";
                return next(context, filePath);
              },
            }),
          }),
        },
      };

      const hre = await createHardhatRuntimeEnvironment(
        {
          plugins: [fileMapperPlugin],
          tasks: [
            solidityNoOp,
            mockRunner("runner-a", () => undefined),
            mockRunner("runner-b", () => undefined),
          ],
        },
        { gasStats: true },
      );

      // Simulate a stale previous run: runner-b has data saved to disk
      const gasAnalytics = getGasAnalyticsManager(hre);
      gasAnalytics.addGasMeasurement({
        type: "function",
        contractFqn: "project/contracts/MyContract.sol:MyContract",
        functionSig: "staleFunctionFromRunnerB()",
        gas: 99999,
        proxyChain: [],
      });
      await gasAnalytics.saveGasMeasurements("runner-b");

      // Run only testFiles mapped to runner-a — runner-b is skipped
      await hre.tasks.getTask("test").run({
        noCompile: true,
        testFiles: ["runner-a-test.ts"],
      });

      const output = consoleMock.mock.calls
        .map((call) => String(call.arguments[0] ?? ""))
        .join("\n");

      assert.ok(
        !output.includes("staleFunctionFromRunnerB"),
        "Gas stats report should NOT include stale data from runner-b which was skipped",
      );
    });
  });
});

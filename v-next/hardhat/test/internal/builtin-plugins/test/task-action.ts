import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { overrideTask, task } from "../../../../src/config.js";
import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
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

  describe("subtask returning Result<TestSummary, TestSummary>", function () {
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
  });
});

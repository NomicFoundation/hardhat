import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import {
  getHookExecutionFrame,
  getTaskExecutionFrame,
  isConfigLoadingBoundaryFrame,
  isConsoleEvaluationBoundaryFrame,
  isEdrFrame,
  isFirstPartyPluginFrame,
  isHookHandlerBoundaryFrame,
  isMochaTestExecutionBoundaryFrame,
  isNodeTestExecutionBoundaryFrame,
  isRunningInsideHardhatMonorepo,
  isScriptExecutionBoundaryFrame,
  isTaskActionBoundaryFrame,
  isThirdPartyFrame,
  isWorkspaceInitFilesystemFrame,
} from "../../../../../src/internal/cli/telemetry/error-classification/codebase-dependent-helpers.js";
import { createErrorContext } from "../../../../../src/internal/cli/telemetry/error-classification/helpers.js";
import { importUserConfig } from "../../../../../src/internal/config-loading.js";
import { useTestProjectTemplate } from "../../../builtin-plugins/solidity/build-system/resolver/helpers.js";

import {
  captureError,
  frame,
  pluginWithConfigHook,
  pluginWithTask,
  pluginWithTaskOverride,
} from "./helpers.js";

describe("error-classification/codebase-dependent-helpers", () => {
  describe("integration tests", () => {
    it("detects the config loading boundary from a real config import failure", async () => {
      await using project = await useTestProjectTemplate({
        name: "codebase-dependent-helper-config-loading",
        version: "1.0.0",
        files: {
          "hardhat.config.mjs": `
throw new Error("config loading failure");
`,
        },
      });

      process.chdir(project.path);
      const error = await captureError(async () => {
        await importUserConfig("./hardhat.config.mjs");
      });
      const frames = createErrorContext(error).allStackFrames;

      assert.equal(frames.some(isConfigLoadingBoundaryFrame), true);
    });

    it("detects the script execution boundary from a real run task failure", async () => {
      await using project = await useTestProjectTemplate({
        name: "codebase-dependent-helper-run-task",
        version: "1.0.0",
        files: {
          "scripts/fail.mjs": `
throw new Error("script execution failure");
`,
        },
      });

      const hre = await project.getHRE();
      process.chdir(project.path);
      const error = await captureError(async () => {
        await hre.tasks.getTask("run").run({
          script: "./scripts/fail.mjs",
          noCompile: true,
        });
      });
      const frames = createErrorContext(error).allStackFrames;

      assert.equal(frames.some(isScriptExecutionBoundaryFrame), true);
    });

    it("finds the plugin task action frame from a real plugin task failure", async () => {
      await using project = await useTestProjectTemplate({
        name: "codebase-dependent-helper-plugin-task",
        version: "1.0.0",
        files: {},
        dependencies: {
          "hardhat-test-plugin": {
            name: "hardhat-test-plugin",
            version: "1.0.0",
            files: {
              "task-action.mjs": `
export default async function pluginTaskAction() {
  throw new Error("plugin task failure");
}
`,
            },
          },
        },
      });

      const taskActionPath = path.join(
        project.path,
        "node_modules",
        "hardhat-test-plugin",
        "task-action.mjs",
      );
      const hre = await project.getHRE({
        plugins: [
          pluginWithTask(
            "hardhat-test-plugin",
            "codebase-dependent-helper-plugin-task",
            taskActionPath,
          ),
        ],
      });

      const error = await captureError(async () => {
        await hre.tasks
          .getTask("codebase-dependent-helper-plugin-task")
          .run({});
      });

      const frames = createErrorContext(error).allStackFrames;
      const taskExecutionFrame = getTaskExecutionFrame(frames);

      assert.equal(frames.some(isTaskActionBoundaryFrame), true);
      assert.ok(
        taskExecutionFrame !== undefined,
        "Expected to find the plugin task action frame",
      );
      assert.equal(
        taskExecutionFrame.location.endsWith(
          "/node_modules/hardhat-test-plugin/task-action.mjs",
        ),
        true,
      );
    });

    it("skips resolved-task helper frames when finding a real plugin task action frame", async () => {
      await using project = await useTestProjectTemplate({
        name: "codebase-dependent-helper-plugin-task-nested",
        version: "1.0.0",
        files: {},
        dependencies: {
          "hardhat-test-plugin": {
            name: "hardhat-test-plugin",
            version: "1.0.0",
            files: {
              "task-action.mjs": `
export default async function outerPluginTask(_taskArguments, _hre, runSuper) {
  return await runSuper({});
}
`,
            },
          },
          "hardhat-inner-test-plugin": {
            name: "hardhat-inner-test-plugin",
            version: "1.0.0",
            files: {
              "task-action.mjs": `
export default async function innerPluginTask() {
  throw new Error("inner plugin task failure");
}
`,
            },
          },
        },
      });

      const outerTaskActionPath = path.join(
        project.path,
        "node_modules",
        "hardhat-test-plugin",
        "task-action.mjs",
      );
      const innerTaskActionPath = path.join(
        project.path,
        "node_modules",
        "hardhat-inner-test-plugin",
        "task-action.mjs",
      );
      const hre = await project.getHRE({
        plugins: [
          pluginWithTask(
            "hardhat-inner-test-plugin",
            "codebase-dependent-helper-plugin-task-nested",
            innerTaskActionPath,
          ),
          pluginWithTaskOverride(
            "hardhat-test-plugin",
            "codebase-dependent-helper-plugin-task-nested",
            outerTaskActionPath,
          ),
        ],
      });

      const error = await captureError(async () => {
        await hre.tasks
          .getTask("codebase-dependent-helper-plugin-task-nested")
          .run({});
      });

      const taskExecutionFrame = getTaskExecutionFrame(
        createErrorContext(error).allStackFrames,
      );

      assert.ok(
        taskExecutionFrame !== undefined,
        "Expected to find the outer plugin task action frame",
      );
      assert.equal(
        taskExecutionFrame.location.endsWith(
          "/node_modules/hardhat-test-plugin/task-action.mjs",
        ),
        true,
      );
    });

    it("finds the plugin hook handler frame from a real hook failure", async () => {
      await using project = await useTestProjectTemplate({
        name: "codebase-dependent-helper-plugin-hook",
        version: "1.0.0",
        files: {},
        dependencies: {
          "hardhat-test-plugin": {
            name: "hardhat-test-plugin",
            version: "1.0.0",
            files: {
              "hook-handlers/config.mjs": `
export default async function createHandlers() {
  return {
    extendUserConfig: async () => {
      throw new Error("plugin hook failure");
    },
  };
}
`,
            },
          },
        },
      });

      const hookFactoryPath = path.join(
        project.path,
        "node_modules",
        "hardhat-test-plugin",
        "hook-handlers",
        "config.mjs",
      );
      const error = await captureError(async () => {
        await project.getHRE({
          plugins: [
            pluginWithConfigHook("hardhat-test-plugin", hookFactoryPath),
          ],
        });
      });
      const frames = createErrorContext(error).allStackFrames;
      const hookExecutionFrame = getHookExecutionFrame(frames);

      assert.equal(frames.some(isHookHandlerBoundaryFrame), true);
      assert.ok(
        hookExecutionFrame !== undefined,
        "Expected to find the plugin hook handler frame",
      );
      assert.equal(
        hookExecutionFrame.location.endsWith(
          "/node_modules/hardhat-test-plugin/hook-handlers/config.mjs",
        ),
        true,
      );
    });

    it("skips hook-manager helper frames when finding a real plugin hook handler frame", async () => {
      await using project = await useTestProjectTemplate({
        name: "codebase-dependent-helper-plugin-hook-nested",
        version: "1.0.0",
        files: {},
        dependencies: {
          "hardhat-test-plugin": {
            name: "hardhat-test-plugin",
            version: "1.0.0",
            files: {
              "hook-handlers/config.mjs": `
export default async function createHandlers() {
  return {
    extendUserConfig: async (config, next) => {
      return await next(config);
    },
  };
}
`,
            },
          },
          "hardhat-inner-test-plugin": {
            name: "hardhat-inner-test-plugin",
            version: "1.0.0",
            files: {
              "hook-handlers/config.mjs": `
export default async function createHandlers() {
  return {
    extendUserConfig: async () => {
      throw new Error("inner plugin hook failure");
    },
  };
}
`,
            },
          },
        },
      });

      const outerHookFactoryPath = path.join(
        project.path,
        "node_modules",
        "hardhat-test-plugin",
        "hook-handlers",
        "config.mjs",
      );
      const innerHookFactoryPath = path.join(
        project.path,
        "node_modules",
        "hardhat-inner-test-plugin",
        "hook-handlers",
        "config.mjs",
      );

      const error = await captureError(async () => {
        await project.getHRE({
          plugins: [
            pluginWithConfigHook(
              "hardhat-inner-test-plugin",
              innerHookFactoryPath,
            ),
            pluginWithConfigHook("hardhat-test-plugin", outerHookFactoryPath),
          ],
        });
      });

      const hookExecutionFrame = getHookExecutionFrame(
        createErrorContext(error).allStackFrames,
      );

      assert.ok(
        hookExecutionFrame !== undefined,
        "Expected to find the outer plugin hook handler frame",
      );
      assert.equal(
        hookExecutionFrame.location.endsWith(
          "/node_modules/hardhat-test-plugin/hook-handlers/config.mjs",
        ),
        true,
      );
    });
  });

  describe("unit tests", () => {
    it("detects whether the tests are running from the Hardhat monorepo", () => {
      assert.equal(isRunningInsideHardhatMonorepo(), true);
    });

    it("detects the console evaluation boundary frame", () => {
      // This couldn't be integration-tested without the test hanging
      assert.equal(
        isConsoleEvaluationBoundaryFrame(
          frame(
            "/workspace/node_modules/hardhat/src/internal/builtin-plugins/console/task-action.js",
            "consoleAction",
          ),
        ),
        true,
      );
    });

    it("detects node:test and mocha test runner boundary frames", () => {
      // These are unit tested because they depend on a different package
      assert.equal(
        isNodeTestExecutionBoundaryFrame(
          frame(
            "/workspace/node_modules/@nomicfoundation/hardhat-node-test-runner/src/task-action.js",
            "testWithHardhat",
          ),
        ),
        true,
      );
      assert.equal(
        isMochaTestExecutionBoundaryFrame(
          frame(
            "/workspace/node_modules/@nomicfoundation/hardhat-mocha/src/task-action.js",
            "testWithHardhat",
          ),
        ),
        true,
      );
    });

    it("returns undefined when task and hook boundary frames are missing", () => {
      const frames = [frame("/workspace/node_modules/plugin/task.js", "run")];

      assert.equal(getTaskExecutionFrame(frames), undefined);
      assert.equal(getHookExecutionFrame(frames), undefined);
    });

    it("classifies first-party and third-party package locations", () => {
      assert.equal(
        isFirstPartyPluginFrame("/workspace/node_modules/hardhat/index.js"),
        true,
      );
      assert.equal(
        isFirstPartyPluginFrame(
          "/workspace/node_modules/@nomicfoundation/hardhat-ethers/index.js",
        ),
        true,
      );
      assert.equal(
        isThirdPartyFrame(
          "/workspace/node_modules/hardhat-awesome-plugin/index.js",
        ),
        true,
      );
      assert.equal(
        isThirdPartyFrame(
          "/workspace/node_modules/@nomicfoundation/hardhat-ethers/index.js",
        ),
        false,
      );
    });

    it("detects workspace init filesystem frames", () => {
      // This is artificial because it's hard to trigger the init code in an
      // integration way, at least while it's interactive.
      const error = new Error("init failure");
      Object.defineProperty(error, "stack", {
        configurable: true,
        value:
          "Error: init failure\n" +
          "    at copyProject (/workspace/node_modules/hardhat/src/internal/cli/init/template.js:1:1)",
      });

      assert.equal(isWorkspaceInitFilesystemFrame(error), true);
      assert.equal(isWorkspaceInitFilesystemFrame(new Error("plain")), false);
    });

    it("detects EDR provider and stack-trace frames", () => {
      assert.equal(
        isEdrFrame(
          frame(
            "/workspace/node_modules/hardhat/src/internal/builtin-plugins/network-manager/edr/stack-traces/errors.js",
            "trace",
          ),
        ),
        true,
      );
      assert.equal(
        isEdrFrame(
          frame(
            "/workspace/node_modules/hardhat/src/internal/builtin-plugins/network-manager/edr-provider.js",
            "request",
          ),
        ),
        true,
      );
    });
  });
});

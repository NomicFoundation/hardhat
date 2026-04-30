import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  InvalidFileFormatError,
  readJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import {
  DispatcherError,
  RequestError,
  ResponseStatusCodeError,
} from "@nomicfoundation/hardhat-utils/request";
import { SubprocessFileNotFoundError } from "@nomicfoundation/hardhat-utils/subprocess";

import {
  EdrProviderStackTraceGenerationError,
  SolidityTestStackTraceGenerationError,
} from "../../../../../src/internal/builtin-plugins/network-manager/edr/stack-traces/stack-trace-generation-errors.js";
import {
  LimitExceededError,
  UnknownError,
} from "../../../../../src/internal/builtin-plugins/network-manager/provider-errors.js";
import {
  classifyError,
  ErrorCategory,
} from "../../../../../src/internal/cli/telemetry/error-classification/classifier.js";
import { importUserConfig } from "../../../../../src/internal/config-loading.js";
import { task } from "../../../../../src/internal/core/config.js";
import { useTestProjectTemplate } from "../../../builtin-plugins/solidity/build-system/resolver/helpers.js";

import {
  captureError,
  errorWithStack,
  pluginWithConfigHook,
  pluginWithTask,
  pluginWithTaskOverride,
  setStack,
} from "./helpers.js";

const hardhatErrorDescriptor = {
  number: 90100,
  messageTemplate: "synthetic hardhat error",
  websiteTitle: "Synthetic hardhat error",
  websiteDescription: "Synthetic hardhat error description",
} as const;

describe("error-classification/classifier", () => {
  describe("integration tests", () => {
    it("classifies development-time errors when running from the monorepo", () => {
      assert.equal(
        classifyError(new Error("boom")),
        ErrorCategory.DEVELOPMENT_TIME_ERROR,
      );
    });

    it("classifies config loading errors from a real config import failure", async () => {
      await using project = await useTestProjectTemplate({
        name: "classifier-config-loading",
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

      assert.equal(
        classifyError(error, true),
        ErrorCategory.CONFIG_LOADING_ERROR,
      );
    });

    it("classifies config loading errors from config dependencies", async () => {
      await using project = await useTestProjectTemplate({
        name: "classifier-config-loading-dependency",
        version: "1.0.0",
        files: {
          "hardhat.config.mjs": `
import "./config-helper.mjs";
export default {};
`,
          "config-helper.mjs": `
throw new Error("config dependency failure");
`,
        },
      });

      process.chdir(project.path);
      const error = await captureError(async () => {
        await importUserConfig("./hardhat.config.mjs");
      });

      assert.equal(
        classifyError(error, true),
        ErrorCategory.CONFIG_LOADING_ERROR,
      );
    });

    it("classifies script execution errors from a real run task failure", async () => {
      await using project = await useTestProjectTemplate({
        name: "classifier-script-execution",
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

      assert.equal(
        classifyError(error, true),
        ErrorCategory.SCRIPT_EXECUTION_ERROR,
      );
    });

    it("classifies script execution errors from script dependencies", async () => {
      await using project = await useTestProjectTemplate({
        name: "classifier-script-execution-dependency",
        version: "1.0.0",
        files: {
          "scripts/fail.mjs": `
import "./helper.mjs";
`,
          "scripts/helper.mjs": `
throw new Error("script dependency failure");
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

      assert.equal(
        classifyError(error, true),
        ErrorCategory.SCRIPT_EXECUTION_ERROR,
      );
    });

    it("classifies first-party plugin task action errors", async () => {
      await using project = await useTestProjectTemplate({
        name: "classifier-first-party-task",
        version: "1.0.0",
        files: {},
        dependencies: {
          "@nomicfoundation/test-plugin": {
            name: "@nomicfoundation/test-plugin",
            version: "1.0.0",
            files: {
              "task-action.mjs": `
export default async function firstPartyTaskAction() {
  throw new Error("first-party task failure");
}
`,
            },
          },
        },
      });

      const hre = await project.getHRE({
        plugins: [
          pluginWithTask(
            "@nomicfoundation/test-plugin",
            "classifier-first-party-task",
            path.join(
              project.path,
              "node_modules",
              "@nomicfoundation",
              "test-plugin",
              "task-action.mjs",
            ),
          ),
        ],
      });
      const error = await captureError(async () => {
        await hre.tasks.getTask("classifier-first-party-task").run({});
      });

      assert.equal(classifyError(error, true), ErrorCategory.TASK_ACTION_ERROR);
    });

    it("classifies third-party plugin task action errors", async () => {
      await using project = await useTestProjectTemplate({
        name: "classifier-third-party-task",
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

      const hre = await project.getHRE({
        plugins: [
          pluginWithTask(
            "hardhat-test-plugin",
            "classifier-third-party-task",
            path.join(
              project.path,
              "node_modules",
              "hardhat-test-plugin",
              "task-action.mjs",
            ),
          ),
        ],
      });
      const error = await captureError(async () => {
        await hre.tasks.getTask("classifier-third-party-task").run({});
      });

      assert.equal(
        classifyError(error, true),
        ErrorCategory.PLUGIN_TASK_ACTION_ERROR,
      );
    });

    it("classifies user task action errors", async () => {
      await using project = await useTestProjectTemplate({
        name: "classifier-user-task",
        version: "1.0.0",
        files: {
          "task-actions.mjs": `
export async function userTaskAction() {
  throw new Error("user task failure");
}
`,
        },
      });

      const actions = await import(
        pathToFileURL(path.join(project.path, "task-actions.mjs")).href
      );
      const hre = await project.getHRE({
        tasks: [
          task("classifier-user-task")
            .setInlineAction(actions.userTaskAction)
            .build(),
        ],
      });
      const error = await captureError(async () => {
        await hre.tasks.getTask("classifier-user-task").run({});
      });

      assert.equal(
        classifyError(error, true),
        ErrorCategory.USER_TASK_ACTION_ERROR,
      );
    });

    it("classifies third-party plugin task overrides", async () => {
      await using project = await useTestProjectTemplate({
        name: "classifier-third-party-task-override",
        version: "1.0.0",
        files: {},
        dependencies: {
          "hardhat-test-plugin": {
            name: "hardhat-test-plugin",
            version: "1.0.0",
            files: {
              "task-override.mjs": `
export default async function pluginTaskOverride() {
  throw new Error("plugin task override failure");
}
`,
            },
          },
        },
      });

      const hre = await project.getHRE({
        plugins: [
          pluginWithTaskOverride(
            "hardhat-test-plugin",
            "run",
            path.join(
              project.path,
              "node_modules",
              "hardhat-test-plugin",
              "task-override.mjs",
            ),
          ),
        ],
      });
      const error = await captureError(async () => {
        await hre.tasks.getTask("run").run({
          script: "./scripts/unused.mjs",
          noCompile: true,
        });
      });

      assert.equal(
        classifyError(error, true),
        ErrorCategory.PLUGIN_TASK_ACTION_ERROR,
      );
    });

    it("classifies third-party plugin hook handler errors", async () => {
      await using project = await useTestProjectTemplate({
        name: "classifier-plugin-hook",
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

      const error = await captureError(async () => {
        await project.getHRE({
          plugins: [
            pluginWithConfigHook(
              "hardhat-test-plugin",
              path.join(
                project.path,
                "node_modules",
                "hardhat-test-plugin",
                "hook-handlers",
                "config.mjs",
              ),
            ),
          ],
        });
      });

      assert.equal(
        classifyError(error, true),
        ErrorCategory.PLUGIN_HOOK_HANDLER_ERROR,
      );
    });

    it("classifies real HardhatErrors before boundary-only categories", async () => {
      await using project = await useTestProjectTemplate({
        name: "classifier-hardhat-error",
        version: "1.0.0",
        files: {},
      });

      const hre = await project.getHRE();
      process.chdir(project.path);
      const error = await captureError(async () => {
        await hre.tasks.getTask("run").run({
          script: "./scripts/missing.mjs",
          noCompile: true,
        });
      });

      assert.equal(classifyError(error, true), ErrorCategory.HARDHAT_ERROR);
    });

    it("classifies real filesystem errors before script boundary categories", async () => {
      await using project = await useTestProjectTemplate({
        name: "classifier-filesystem",
        version: "1.0.0",
        files: {
          "bad.json": "{",
        },
      });

      const error = await captureError(async () => {
        await readJsonFile(path.join(project.path, "bad.json"));
      });

      assert.equal(
        classifyError(error, true),
        ErrorCategory.FILESYSTEM_INTERACTION_ERROR,
      );
    });
  });

  describe("unit tests", () => {
    describe("CJS to ESM migration", () => {
      for (const message of [
        "ReferenceError: require is not defined in ES module scope",
        "ReferenceError: module is not defined in ES module scope",
        "ReferenceError: exports is not defined in ES module scope",
        "ReferenceError: __dirname is not defined in ES module scope",
        "ReferenceError: __filename is not defined in ES module scope",
        "SyntaxError: Cannot use import statement outside a module",
      ]) {
        it(`classifies ${message}`, () => {
          assert.equal(
            classifyError(errorWithStack("ReferenceError", message), true),
            ErrorCategory.CJS_TO_ESM_MIGRATION_ERROR,
          );
        });
      }

      it("classifies require() of ES Module failures through the cause chain", () => {
        const cause = errorWithStack(
          "Error",
          "require() of ES Module /workspace/node_modules/hardhat/index.js is not supported",
        );
        const error = errorWithStack("Error", "wrapper", [], cause);

        assert.equal(
          classifyError(error, true),
          ErrorCategory.CJS_TO_ESM_MIGRATION_ERROR,
        );
      });
    });

    describe("HH2 to HH3 migration", () => {
      for (const message of [
        "The requested module 'hardhat' does not provide an export named 'ethers'",
        "The requested module 'hardhat/config' does not provide an export named 'vars'",
        "You are trying to use a Hardhat 2 plugin in a Hardhat 3 project",
      ]) {
        it(`classifies ${message}`, () => {
          assert.equal(
            classifyError(errorWithStack("Error", message), true),
            ErrorCategory.HH2_TO_HH3_MIGRATION_ERROR,
          );
        });
      }

      it("classifies same-named UsingHardhat2PluginError instances", () => {
        assert.equal(
          classifyError(errorWithStack("UsingHardhat2PluginError", ""), true),
          ErrorCategory.HH2_TO_HH3_MIGRATION_ERROR,
        );
      });

      it("classifies @nomiclabs stack frames", () => {
        const error = errorWithStack("Error", "boom", [
          "    at plugin (/workspace/node_modules/@nomiclabs/hardhat-ethers/index.js:1:1)",
        ]);

        assert.equal(
          classifyError(error, true),
          ErrorCategory.HH2_TO_HH3_MIGRATION_ERROR,
        );
      });
    });

    describe("TypeScript support", () => {
      // These are unit-tested because Node's TypeScript support errors depend
      // on the Node.js version and runtime flags used to execute the tests.
      for (const code of [
        "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX",
        "ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING",
        "ERR_NO_TYPESCRIPT",
      ]) {
        it(`classifies ${code}`, () => {
          assert.equal(
            classifyError(
              Object.assign(new Error("TypeScript support failure"), { code }),
              true,
            ),
            ErrorCategory.TYPESCRIPT_SUPPORT_ERROR,
          );
        });
      }

      for (const extension of [".ts", ".mts", ".cts", ".TS", ".MTS", ".CTS"]) {
        it(`classifies ERR_UNKNOWN_FILE_EXTENSION for ${extension} files`, () => {
          assert.equal(
            classifyError(
              Object.assign(
                new Error(`Unknown file extension "${extension}"`),
                { code: "ERR_UNKNOWN_FILE_EXTENSION" },
              ),
              true,
            ),
            ErrorCategory.TYPESCRIPT_SUPPORT_ERROR,
          );
        });
      }

      it("doesn't classify ERR_UNKNOWN_FILE_EXTENSION for non-TypeScript files", () => {
        assert.equal(
          classifyError(
            Object.assign(new Error('Unknown file extension ".vue"'), {
              code: "ERR_UNKNOWN_FILE_EXTENSION",
            }),
            true,
          ),
          ErrorCategory.UNEXPECTED_ERROR,
        );
      });

      it("classifies TypeScript support errors through the cause chain", () => {
        const cause = Object.assign(new Error("No TypeScript support"), {
          code: "ERR_NO_TYPESCRIPT",
        });
        const error = errorWithStack("Error", "wrapper", [], cause);

        assert.equal(
          classifyError(error, true),
          ErrorCategory.TYPESCRIPT_SUPPORT_ERROR,
        );
      });
    });

    describe("boundary-only categories", () => {
      const cases: Array<{
        category: ErrorCategory;
        frame: string;
      }> = [
        {
          category: ErrorCategory.CONSOLE_EVALUATION_ERROR,
          frame:
            "    at consoleAction (/workspace/node_modules/hardhat/src/internal/builtin-plugins/console/task-action.js:1:1)",
        },
        {
          category: ErrorCategory.NODE_TEST_EXECUTION_ERROR,
          frame:
            "    at testWithHardhat (/workspace/node_modules/@nomicfoundation/hardhat-node-test-runner/src/task-action.js:1:1)",
        },
        {
          category: ErrorCategory.MOCHA_TEST_EXECUTION_ERROR,
          frame:
            "    at testWithHardhat (/workspace/node_modules/@nomicfoundation/hardhat-mocha/src/task-action.js:1:1)",
        },
      ];

      for (const { category, frame } of cases) {
        it(`classifies ${category}`, () => {
          assert.equal(
            classifyError(errorWithStack("Error", "boom", [frame]), true),
            category,
          );
        });
      }
    });

    describe("provider and EDR", () => {
      it("classifies SolidityError as provider interaction", () => {
        assert.equal(
          classifyError(errorWithStack("SolidityError", "reverted"), true),
          ErrorCategory.PROVIDER_INTERACTION_ERROR,
        );
      });

      it("classifies known provider errors as provider interaction", () => {
        assert.equal(
          classifyError(new LimitExceededError("too many requests"), true),
          ErrorCategory.PROVIDER_INTERACTION_ERROR,
        );
      });

      it("classifies provider-like UnknownError causes as provider interaction", () => {
        const error = setStack(
          new UnknownError("unknown", new Error("rate limit exceeded")),
          [
            "    at request (/workspace/node_modules/hardhat/src/internal/builtin-plugins/network-manager/edr/edr-provider.js:1:1)",
          ],
        );

        assert.equal(
          classifyError(error, true),
          ErrorCategory.PROVIDER_INTERACTION_ERROR,
        );
      });

      it("classifies stack trace generation errors as EDR errors", () => {
        assert.equal(
          classifyError(
            new EdrProviderStackTraceGenerationError("trace failed"),
            true,
          ),
          ErrorCategory.EDR_ERROR,
        );
        assert.equal(
          classifyError(
            new SolidityTestStackTraceGenerationError("trace failed"),
            true,
          ),
          ErrorCategory.EDR_ERROR,
        );
      });

      it("classifies remaining UnknownError instances with EDR frames as EDR errors", () => {
        const error = setStack(new UnknownError("unknown"), [
          "    at request (/workspace/node_modules/hardhat/src/internal/builtin-plugins/network-manager/edr-provider.js:1:1)",
        ]);

        assert.equal(classifyError(error, true), ErrorCategory.EDR_ERROR);
      });
    });

    describe("network interaction", () => {
      it("classifies hardhat-utils request errors as network interaction", () => {
        const responseCause = Object.assign(new Error("bad status"), {
          statusCode: 500,
        });

        for (const error of [
          new ResponseStatusCodeError("https://example.test", responseCause),
          new DispatcherError("bad proxy"),
          new RequestError("https://example.test", "GET"),
        ]) {
          assert.equal(
            classifyError(error, true),
            ErrorCategory.NETWORK_INTERACTION_ERROR,
          );
        }
      });

      it("classifies fetch failed messages as network interaction", () => {
        assert.equal(
          classifyError(errorWithStack("TypeError", "fetch failed"), true),
          ErrorCategory.NETWORK_INTERACTION_ERROR,
        );
      });
    });

    describe("runtime environment", () => {
      for (const message of [
        "value.toReversed is not a function",
        "value.flatMap is not a function",
        "crypto is not defined",
      ]) {
        it(`classifies ${message}`, () => {
          assert.equal(
            classifyError(errorWithStack("TypeError", message), true),
            ErrorCategory.RUNTIME_ENVIRONMENT_ERROR,
          );
        });
      }
    });

    describe("filesystem interaction", () => {
      it("classifies known filesystem and subprocess errors", () => {
        for (const error of [
          new InvalidFileFormatError("/workspace/bad.json", new Error("bad")),
          new SubprocessFileNotFoundError("/workspace/missing.js"),
        ]) {
          assert.equal(
            classifyError(error, true),
            ErrorCategory.FILESYSTEM_INTERACTION_ERROR,
          );
        }
      });

      it("classifies Node filesystem error codes through the cause chain", () => {
        const cause = Object.assign(new Error("missing"), { code: "ENOENT" });
        const error = errorWithStack("Error", "wrapper", [], cause);

        assert.equal(
          classifyError(error, true),
          ErrorCategory.FILESYSTEM_INTERACTION_ERROR,
        );
      });

      it("doesn't loop on cyclic cause chains when reading Node error codes", () => {
        const a = errorWithStack("Error", "a");
        const b = errorWithStack("Error", "b");
        Object.assign(a, { cause: b });
        Object.assign(b, { cause: a });

        assert.equal(classifyError(a, true), ErrorCategory.UNEXPECTED_ERROR);
      });
    });

    describe("precedence and fallback", () => {
      it("classifies HardhatError before boundary categories", () => {
        const error = setStack(new HardhatError(hardhatErrorDescriptor), [
          "    at runScriptWithHardhat (/workspace/node_modules/hardhat/src/internal/builtin-plugins/run/task-action.js:1:1)",
        ]);

        assert.equal(classifyError(error, true), ErrorCategory.HARDHAT_ERROR);
      });

      it("classifies filesystem errors before boundary categories", () => {
        const error = setStack(
          new InvalidFileFormatError("/workspace/bad.json", new Error("bad")),
          [
            "    at runScriptWithHardhat (/workspace/node_modules/hardhat/src/internal/builtin-plugins/run/task-action.js:1:1)",
          ],
        );

        assert.equal(
          classifyError(error, true),
          ErrorCategory.FILESYSTEM_INTERACTION_ERROR,
        );
      });

      it("falls back to unexpected errors", () => {
        assert.equal(
          classifyError(errorWithStack("Error", "boom"), true),
          ErrorCategory.UNEXPECTED_ERROR,
        );
      });
    });
  });
});

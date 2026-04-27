import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { readJsonFile } from "@nomicfoundation/hardhat-utils/fs";

import {
  classifyError,
  ErrorCategory,
} from "../../../../../src/internal/cli/telemetry/error-classification/classifier.js";
import { shouldBeReported } from "../../../../../src/internal/cli/telemetry/error-classification/filter.js";
import { importUserConfig } from "../../../../../src/internal/config-loading.js";
import { task } from "../../../../../src/internal/core/config.js";
import { useTestProjectTemplate } from "../../../builtin-plugins/solidity/build-system/resolver/helpers.js";

import {
  captureError,
  errorWithStack,
  firstPartyHelper,
  pluginWithConfigHook,
  pluginWithTask,
} from "./helpers.js";

const reportableDescriptor = {
  number: 90200,
  messageTemplate: "reportable synthetic hardhat error",
  websiteTitle: "Reportable synthetic hardhat error",
  websiteDescription: "Reportable synthetic hardhat error description",
  shouldBeReported: true,
} as const;

const nonReportableDescriptor = {
  number: 90201,
  messageTemplate: "non-reportable synthetic hardhat error",
  websiteTitle: "Non-reportable synthetic hardhat error",
  websiteDescription: "Non-reportable synthetic hardhat error description",
} as const;

describe("error-classification/filter", () => {
  describe("integration tests", () => {
    it("drops plain user config loading failures", async () => {
      await using project = await useTestProjectTemplate({
        name: "filter-config-user",
        version: "1.0.0",
        files: {
          "hardhat.config.mjs": `
throw new Error("config user failure");
`,
        },
      });

      process.chdir(project.path);
      const error = await captureError(async () => {
        await importUserConfig("./hardhat.config.mjs");
      });

      assertReportDecision(error, ErrorCategory.CONFIG_LOADING_ERROR, false);
    });

    it("reports config loading failures that come from first-party code", async () => {
      await using project = await useTestProjectTemplate({
        name: "filter-config-first-party",
        version: "1.0.0",
        files: {
          "hardhat.config.mjs": `
import { fail } from "@nomicfoundation/test-helper/helper.mjs";
await fail();
export default {};
`,
        },
        dependencies: {
          "@nomicfoundation/test-helper": firstPartyHelper(
            "config first-party failure",
          ),
        },
      });

      process.chdir(project.path);
      const error = await captureError(async () => {
        await importUserConfig("./hardhat.config.mjs");
      });

      assertReportDecision(error, ErrorCategory.CONFIG_LOADING_ERROR, true);
    });

    it("drops plain user script failures", async () => {
      await using project = await useTestProjectTemplate({
        name: "filter-script-user",
        version: "1.0.0",
        files: {
          "scripts/fail.mjs": `
throw new Error("script user failure");
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

      assertReportDecision(error, ErrorCategory.SCRIPT_EXECUTION_ERROR, false);
    });

    it("reports script failures that come from first-party code", async () => {
      await using project = await useTestProjectTemplate({
        name: "filter-script-first-party",
        version: "1.0.0",
        files: {
          "scripts/fail.mjs": `
import { fail } from "@nomicfoundation/test-helper/helper.mjs";
await fail();
`,
        },
        dependencies: {
          "@nomicfoundation/test-helper": firstPartyHelper(
            "script first-party failure",
          ),
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

      assertReportDecision(error, ErrorCategory.SCRIPT_EXECUTION_ERROR, true);
    });

    it("drops plain third-party plugin task failures", async () => {
      await using project = await useTestProjectTemplate({
        name: "filter-plugin-task-user",
        version: "1.0.0",
        files: {},
        dependencies: {
          "hardhat-test-plugin": {
            name: "hardhat-test-plugin",
            version: "1.0.0",
            files: {
              "task-action.mjs": `
export default async function pluginTaskAction() {
  throw new Error("plugin task user failure");
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
            "filter-plugin-task-user",
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
        await hre.tasks.getTask("filter-plugin-task-user").run({});
      });

      assertReportDecision(
        error,
        ErrorCategory.PLUGIN_TASK_ACTION_ERROR,
        false,
      );
    });

    it("reports third-party plugin task failures that come from first-party code", async () => {
      await using project = await useTestProjectTemplate({
        name: "filter-plugin-task-first-party",
        version: "1.0.0",
        files: {},
        dependencies: {
          "hardhat-test-plugin": {
            name: "hardhat-test-plugin",
            version: "1.0.0",
            files: {
              "task-action.mjs": `
import { fail } from "@nomicfoundation/test-helper/helper.mjs";

export default async function pluginTaskAction() {
  await fail();
}
`,
            },
          },
          "@nomicfoundation/test-helper": firstPartyHelper(
            "plugin task first-party failure",
          ),
        },
      });

      const hre = await project.getHRE({
        plugins: [
          pluginWithTask(
            "hardhat-test-plugin",
            "filter-plugin-task-first-party",
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
        await hre.tasks.getTask("filter-plugin-task-first-party").run({});
      });

      assertReportDecision(error, ErrorCategory.PLUGIN_TASK_ACTION_ERROR, true);
    });

    it("drops plain user task failures", async () => {
      await using project = await useTestProjectTemplate({
        name: "filter-user-task",
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
          task("filter-user-task")
            .setInlineAction(actions.userTaskAction)
            .build(),
        ],
      });
      const error = await captureError(async () => {
        await hre.tasks.getTask("filter-user-task").run({});
      });

      assertReportDecision(error, ErrorCategory.USER_TASK_ACTION_ERROR, false);
    });

    it("reports user task failures that come from first-party code", async () => {
      await using project = await useTestProjectTemplate({
        name: "filter-user-task-first-party",
        version: "1.0.0",
        files: {
          "task-actions.mjs": `
import { fail } from "@nomicfoundation/test-helper/helper.mjs";

export async function userTaskAction() {
  await fail();
}
`,
        },
        dependencies: {
          "@nomicfoundation/test-helper": firstPartyHelper(
            "user task first-party failure",
          ),
        },
      });

      const actions = await import(
        pathToFileURL(path.join(project.path, "task-actions.mjs")).href
      );
      const hre = await project.getHRE({
        tasks: [
          task("filter-user-task-first-party")
            .setInlineAction(actions.userTaskAction)
            .build(),
        ],
      });
      const error = await captureError(async () => {
        await hre.tasks.getTask("filter-user-task-first-party").run({});
      });

      assertReportDecision(error, ErrorCategory.USER_TASK_ACTION_ERROR, true);
    });

    it("drops plain third-party plugin hook failures", async () => {
      await using project = await useTestProjectTemplate({
        name: "filter-plugin-hook-user",
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
      throw new Error("plugin hook user failure");
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

      assertReportDecision(
        error,
        ErrorCategory.PLUGIN_HOOK_HANDLER_ERROR,
        false,
      );
    });

    it("reports third-party plugin hook failures that come from first-party code", async () => {
      await using project = await useTestProjectTemplate({
        name: "filter-plugin-hook-first-party",
        version: "1.0.0",
        files: {},
        dependencies: {
          "hardhat-test-plugin": {
            name: "hardhat-test-plugin",
            version: "1.0.0",
            files: {
              "hook-handlers/config.mjs": `
import { fail } from "@nomicfoundation/test-helper/helper.mjs";

export default async function createHandlers() {
  return {
    extendUserConfig: async () => {
      await fail();
    },
  };
}
`,
            },
          },
          "@nomicfoundation/test-helper": firstPartyHelper(
            "plugin hook first-party failure",
          ),
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

      assertReportDecision(
        error,
        ErrorCategory.PLUGIN_HOOK_HANDLER_ERROR,
        true,
      );
    });

    it("reports non-boundary non-Hardhat errors", async () => {
      await using project = await useTestProjectTemplate({
        name: "filter-filesystem",
        version: "1.0.0",
        files: {
          "bad.json": "{",
        },
      });

      const error = await captureError(async () => {
        await readJsonFile(path.join(project.path, "bad.json"));
      });

      assertReportDecision(
        error,
        ErrorCategory.FILESYSTEM_INTERACTION_ERROR,
        true,
      );
    });
  });

  describe("unit tests", () => {
    it("drops always-drop categories even for reportable HardhatErrors", () => {
      const error = new HardhatError(reportableDescriptor);

      // TYPESCRIPT_SUPPORT_ERROR is unit-tested here because the underlying
      // Node.js errors depend on the runtime version and TypeScript flags.
      for (const category of [
        ErrorCategory.CJS_TO_ESM_MIGRATION_ERROR,
        ErrorCategory.HH2_TO_HH3_MIGRATION_ERROR,
        ErrorCategory.TYPESCRIPT_SUPPORT_ERROR,
        ErrorCategory.DEVELOPMENT_TIME_ERROR,
        ErrorCategory.PROVIDER_INTERACTION_ERROR,
        ErrorCategory.NETWORK_INTERACTION_ERROR,
        ErrorCategory.RUNTIME_ENVIRONMENT_ERROR,
      ]) {
        assert.equal(shouldBeReported(error, category), false);
      }
    });

    it("honors HardhatError descriptors for non-boundary categories", () => {
      assert.equal(
        shouldBeReported(
          new HardhatError(reportableDescriptor),
          ErrorCategory.HARDHAT_ERROR,
        ),
        true,
      );
      assert.equal(
        shouldBeReported(
          new HardhatError(nonReportableDescriptor),
          ErrorCategory.HARDHAT_ERROR,
        ),
        false,
      );
    });

    it("honors HardhatError descriptors for boundary categories", () => {
      assert.equal(
        shouldBeReported(
          new HardhatError(reportableDescriptor),
          ErrorCategory.SCRIPT_EXECUTION_ERROR,
        ),
        true,
      );
      assert.equal(
        shouldBeReported(
          new HardhatError(nonReportableDescriptor),
          ErrorCategory.SCRIPT_EXECUTION_ERROR,
        ),
        false,
      );
    });

    it("reports non-Hardhat errors for report-by-default categories", () => {
      const error = new Error("boom");

      for (const category of [
        ErrorCategory.HARDHAT_ERROR,
        ErrorCategory.TASK_ACTION_ERROR,
        ErrorCategory.EDR_ERROR,
        ErrorCategory.FILESYSTEM_INTERACTION_ERROR,
        ErrorCategory.UNEXPECTED_ERROR,
      ]) {
        assert.equal(shouldBeReported(error, category), true);
      }
    });

    it("applies boundary stack-shape decisions to console and test runner categories", () => {
      for (const { category, boundaryFrame, hardhatFrame, userFrame } of [
        {
          category: ErrorCategory.CONSOLE_EVALUATION_ERROR,
          boundaryFrame:
            "    at consoleAction (/workspace/node_modules/hardhat/src/internal/builtin-plugins/console/task-action.js:1:1)",
          hardhatFrame:
            "    at helper (/workspace/node_modules/hardhat/src/internal/console-helper.js:1:1)",
          userFrame: "    at user (/workspace/console-input.js:1:1)",
        },
        {
          category: ErrorCategory.NODE_TEST_EXECUTION_ERROR,
          boundaryFrame:
            "    at testWithHardhat (/workspace/node_modules/@nomicfoundation/hardhat-node-test-runner/src/task-action.js:1:1)",
          hardhatFrame:
            "    at helper (/workspace/node_modules/@nomicfoundation/hardhat-node-test-runner/src/helper.js:1:1)",
          userFrame: "    at test (/workspace/test/sample.test.js:1:1)",
        },
        {
          category: ErrorCategory.MOCHA_TEST_EXECUTION_ERROR,
          boundaryFrame:
            "    at testWithHardhat (/workspace/node_modules/@nomicfoundation/hardhat-mocha/src/task-action.js:1:1)",
          hardhatFrame:
            "    at helper (/workspace/node_modules/@nomicfoundation/hardhat-mocha/src/helper.js:1:1)",
          userFrame: "    at test (/workspace/test/sample.spec.js:1:1)",
        },
      ]) {
        assert.equal(
          shouldBeReported(
            errorWithStack("Error", "boom", [userFrame, boundaryFrame]),
            category,
          ),
          false,
        );
        assert.equal(
          shouldBeReported(
            errorWithStack("Error", "boom", [hardhatFrame, boundaryFrame]),
            category,
          ),
          true,
        );
        assert.equal(
          shouldBeReported(errorWithStack("Error", "boom"), category),
          true,
        );
      }
    });

    it("inspects causes when applying boundary stack-shape decisions", () => {
      const cause = errorWithStack("Error", "inner", [
        "    at helper (/workspace/node_modules/hardhat/src/internal/helper.js:1:1)",
        "    at runScriptWithHardhat (/workspace/node_modules/hardhat/src/internal/builtin-plugins/run/task-action.js:1:1)",
      ]);
      const error = errorWithStack("Error", "outer", [], cause);

      assert.equal(
        shouldBeReported(error, ErrorCategory.SCRIPT_EXECUTION_ERROR),
        true,
      );
    });
  });
});

function assertReportDecision(
  error: Error,
  expectedCategory: ErrorCategory,
  expectedShouldBeReported: boolean,
): void {
  const category = classifyError(error, true);

  assert.equal(category, expectedCategory);
  assert.equal(shouldBeReported(error, category), expectedShouldBeReported);
}

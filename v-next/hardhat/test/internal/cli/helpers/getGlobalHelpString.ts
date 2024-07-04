import type { Task } from "@ignored/hardhat-vnext-core/types/tasks";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildGlobalOptionsMap } from "@ignored/hardhat-vnext-core";
import {
  globalOption,
  ParameterType,
} from "@ignored/hardhat-vnext-core/config";
import { readClosestPackageJson } from "@ignored/hardhat-vnext-utils/package";

import { getGlobalHelpString } from "../../../../src/internal/cli/helpers/getGlobalHelpString.js";

describe("getGlobalHelpString", async function () {
  const packageJson = await readClosestPackageJson(import.meta.url);

  describe("when there are no tasks", function () {
    it("should return the global help string", async function () {
      const tasks = new Map();
      const help = await getGlobalHelpString(tasks, new Map());

      const expected = `Hardhat version ${packageJson.version}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

GLOBAL OPTIONS:

  --config                 A Hardhat config file.
  --help                   Shows this message, or a task's help if its name is provided.
  --show-stack-traces      Show stack traces (always enabled on CI servers).
  --version                Shows hardhat's version.

To get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

      assert.equal(help, expected);
    });
  });

  describe("when there are tasks", function () {
    it("should return the global help string with the tasks", async function () {
      const tasks: Map<string, Task> = new Map([
        [
          "task1",
          {
            id: ["task1"],
            description: "task1 description",
            actions: [{ pluginId: "task1-plugin-id", action: () => {} }],
            options: new Map(),
            positionalParameters: [],
            pluginId: "task1-plugin-id",
            subtasks: new Map(),
            isEmpty: false,
            run: async () => {},
          },
        ],
        [
          "task2",
          {
            id: ["task2"],
            description: "task2 description",
            actions: [{ pluginId: "task2-plugin-id", action: () => {} }],
            options: new Map(),
            positionalParameters: [],
            pluginId: "task2-plugin-id",
            subtasks: new Map(),
            isEmpty: false,
            run: async () => {},
          },
        ],
      ]);

      const help = await getGlobalHelpString(tasks, new Map());

      const expected = `Hardhat version ${packageJson.version}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

AVAILABLE TASKS:

  task1                    task1 description
  task2                    task2 description

GLOBAL OPTIONS:

  --config                 A Hardhat config file.
  --help                   Shows this message, or a task's help if its name is provided.
  --show-stack-traces      Show stack traces (always enabled on CI servers).
  --version                Shows hardhat's version.

To get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

      assert.equal(help, expected);
    });
  });

  describe("when there are subtasks", function () {
    it("should return the global help string with the tasks", async function () {
      const tasks: Map<string, Task> = new Map([
        [
          "task1",
          {
            id: ["task1"],
            description: "task1 description",
            actions: [{ pluginId: "task1-plugin-id", action: () => {} }],
            options: new Map(),
            positionalParameters: [],
            pluginId: "task1-plugin-id",
            subtasks: new Map().set("subtask1", {
              id: ["task1", "subtask1"],
              description: "subtask1 description",
              actions: [{ pluginId: "task1-plugin-id", action: () => {} }],
              namedParameters: new Map(),
              positionalParameters: [],
              pluginId: "task1-plugin-id",
              subtasks: new Map(),
              isEmpty: false,
              run: async () => {},
            }),
            isEmpty: false,
            run: async () => {},
          },
        ],
        [
          "task2",
          {
            id: ["task2"],
            description: "task2 description",
            actions: [{ pluginId: "task2-plugin-id", action: () => {} }],
            options: new Map(),
            positionalParameters: [],
            pluginId: "task2-plugin-id",
            subtasks: new Map(),
            isEmpty: false,
            run: async () => {},
          },
        ],
      ]);

      const help = await getGlobalHelpString(tasks, new Map());

      const expected = `Hardhat version ${packageJson.version}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

AVAILABLE TASKS:

  task1                    task1 description
  task2                    task2 description

AVAILABLE SUBTASKS:

  task1 subtask1           subtask1 description

GLOBAL OPTIONS:

  --config                 A Hardhat config file.
  --help                   Shows this message, or a task's help if its name is provided.
  --show-stack-traces      Show stack traces (always enabled on CI servers).
  --version                Shows hardhat's version.

To get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

      assert.equal(help, expected);
    });
  });

  describe("when there are user-defined global options", function () {
    it("should return the global help string with the user-defined global options", async function () {
      const tasks = new Map();
      const globalOptionsMap = buildGlobalOptionsMap([
        {
          id: "plugin1",
          globalOptions: [
            globalOption({
              name: "userOption1",
              description: "userOption1 description.",
              type: ParameterType.STRING,
              defaultValue: "default",
            }),
            globalOption({
              name: "userOption2",
              description: "userOption2 description.",
              type: ParameterType.STRING,
              defaultValue: "default",
            }),
          ],
        },
      ]);
      const help = await getGlobalHelpString(tasks, globalOptionsMap);

      const expected = `Hardhat version ${packageJson.version}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

GLOBAL OPTIONS:

  --config                 A Hardhat config file.
  --help                   Shows this message, or a task's help if its name is provided.
  --show-stack-traces      Show stack traces (always enabled on CI servers).
  --version                Shows hardhat's version.
  --user-option-1          userOption1 description.
  --user-option-2          userOption2 description.

To get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

      assert.equal(help, expected);
    });
  });
});

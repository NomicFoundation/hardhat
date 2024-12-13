import type { Task } from "../../../../src/types/tasks.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readClosestPackageJson } from "@ignored/hardhat-vnext-utils/package";

import { BUILTIN_GLOBAL_OPTIONS_DEFINITIONS } from "../../../../src/internal/builtin-global-options.js";
import { getGlobalHelpString } from "../../../../src/internal/cli/help/get-global-help-string.js";
import { globalOption } from "../../../../src/internal/core/config.js";
import { buildGlobalOptionDefinitions } from "../../../../src/internal/core/global-options.js";
import { ArgumentType } from "../../../../src/types/arguments.js";

describe("getGlobalHelpString", async function () {
  const packageJson = await readClosestPackageJson(import.meta.url);

  describe("when there are no tasks or global options", function () {
    it("should return the global help string", async function () {
      const tasks = new Map();
      const globalOptionDefinitions = new Map();
      const help = await getGlobalHelpString(tasks, globalOptionDefinitions);

      const expected = `Hardhat version ${packageJson.version}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

GLOBAL OPTIONS:



To get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

      assert.equal(help, expected);
    });
  });

  describe("when there are tasks and no global options", function () {
    it("should return the global help string with the tasks", async function () {
      const tasks: Map<string, Task> = new Map([
        [
          "task1",
          {
            id: ["task1"],
            description: "task1 description",
            actions: [{ pluginId: "task1-plugin-id", action: () => {} }],
            options: new Map(),
            positionalArguments: [],
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
            positionalArguments: [],
            pluginId: "task2-plugin-id",
            subtasks: new Map(),
            isEmpty: false,
            run: async () => {},
          },
        ],
      ]);
      const globalOptionDefinitions = new Map();

      const help = await getGlobalHelpString(tasks, globalOptionDefinitions);

      const expected = `Hardhat version ${packageJson.version}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

AVAILABLE TASKS:

  task1      task1 description
  task2      task2 description

GLOBAL OPTIONS:



To get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

      assert.equal(help, expected);
    });
  });

  describe("when there are tasks and subtasks, but not global options", function () {
    it("should return the global help string with the tasks", async function () {
      const tasks: Map<string, Task> = new Map([
        [
          "task1",
          {
            id: ["task1"],
            description: "task1 description",
            actions: [{ pluginId: "task1-plugin-id", action: () => {} }],
            options: new Map(),
            positionalArguments: [],
            pluginId: "task1-plugin-id",
            subtasks: new Map().set("subtask1", {
              id: ["task1", "subtask1"],
              description: "subtask1 description",
              actions: [{ pluginId: "task1-plugin-id", action: () => {} }],
              options: new Map(),
              positionalArguments: [],
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
            positionalArguments: [],
            pluginId: "task2-plugin-id",
            subtasks: new Map(),
            isEmpty: false,
            run: async () => {},
          },
        ],
      ]);
      const globalOptionDefinitions = new Map();

      const help = await getGlobalHelpString(tasks, globalOptionDefinitions);

      const expected = `Hardhat version ${packageJson.version}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

AVAILABLE TASKS:

  task1               task1 description
  task2               task2 description

AVAILABLE SUBTASKS:

  task1 subtask1      subtask1 description

GLOBAL OPTIONS:



To get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

      assert.equal(help, expected);
    });
  });

  describe("when there are global options and no tasks", function () {
    it("should return the global help string with the global options", async function () {
      const tasks = new Map();
      const pluginGlobalOptionDefinitions = buildGlobalOptionDefinitions([
        {
          id: "plugin1",
          globalOptions: [
            globalOption({
              name: "userOption1",
              description: "userOption1 description.",
              type: ArgumentType.STRING,
              defaultValue: "default",
            }),
            globalOption({
              name: "userOption2",
              description: "userOption2 description.",
              type: ArgumentType.STRING,
              defaultValue: "default",
            }),
          ],
        },
      ]);

      const globalOptionDefinitions = new Map([
        ...BUILTIN_GLOBAL_OPTIONS_DEFINITIONS,
        ...pluginGlobalOptionDefinitions,
      ]);

      const help = await getGlobalHelpString(tasks, globalOptionDefinitions);

      const expected = `Hardhat version ${packageJson.version}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

GLOBAL OPTIONS:

  --config                 A Hardhat config file.
  --help                   Shows this message, or a task's help if its name is provided.
  --init                   Initializes a Hardhat project.
  --show-stack-traces      Show stack traces (always enabled on CI servers).
  --user-option-1          userOption1 description.
  --user-option-2          userOption2 description.
  --verbose                Enables Hardhat verbose logging.
  --version                Shows hardhat's version.

To get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

      assert.equal(help, expected);
    });
  });

  describe("when there are tasks, subtasks and global options", function () {
    it("should return the global help string with the tasks, subtasks and global options, all sorted by name", async function () {
      const tasks: Map<string, Task> = new Map([
        [
          "task1",
          {
            id: ["task1"],
            description: "task1 description",
            actions: [{ pluginId: "task1-plugin-id", action: () => {} }],
            options: new Map(),
            positionalArguments: [],
            pluginId: "task1-plugin-id",
            subtasks: new Map().set("subtask1", {
              id: ["task1", "subtask1"],
              description: "subtask1 description",
              actions: [{ pluginId: "task1-plugin-id", action: () => {} }],
              options: new Map(),
              positionalArguments: [],
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
            positionalArguments: [],
            pluginId: "task2-plugin-id",
            subtasks: new Map(),
            isEmpty: false,
            run: async () => {},
          },
        ],
      ]);
      const pluginGlobalOptionDefinitions = buildGlobalOptionDefinitions([
        {
          id: "plugin1",
          globalOptions: [
            globalOption({
              name: "userOption1",
              description: "userOption1 description.",
              type: ArgumentType.STRING,
              defaultValue: "default",
            }),
            globalOption({
              name: "userOption2",
              description: "userOption2 description.",
              type: ArgumentType.STRING,
              defaultValue: "default",
            }),
          ],
        },
      ]);

      const globalOptionDefinitions = new Map([
        ...BUILTIN_GLOBAL_OPTIONS_DEFINITIONS,
        ...pluginGlobalOptionDefinitions,
      ]);

      const help = await getGlobalHelpString(tasks, globalOptionDefinitions);

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
  --init                   Initializes a Hardhat project.
  --show-stack-traces      Show stack traces (always enabled on CI servers).
  --user-option-1          userOption1 description.
  --user-option-2          userOption2 description.
  --verbose                Enables Hardhat verbose logging.
  --version                Shows hardhat's version.

To get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

      assert.equal(help, expected);
    });
  });
});

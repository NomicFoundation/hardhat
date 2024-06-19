import type { Task } from "@nomicfoundation/hardhat-core/types/tasks";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import packageJson from "../../../../package.json";
import { getGlobalHelpString } from "../../../../src/internal/cli/helpers/getGlobalHelpString.js";

describe("getGlobalHelpString", function () {
  describe("when there are no tasks", function () {
    it("should return the global help string", async function () {
      const tasks = new Map();
      const help = await getGlobalHelpString(tasks);

      const expected = `Hardhat version ${packageJson.version}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

GLOBAL OPTIONS:

  --config                 A Hardhat config file.
  --help                   Shows this message, or a task's help if its name is provided
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
            namedParameters: new Map(),
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
            namedParameters: new Map(),
            positionalParameters: [],
            pluginId: "task2-plugin-id",
            subtasks: new Map(),
            isEmpty: false,
            run: async () => {},
          },
        ],
      ]);

      const help = await getGlobalHelpString(tasks);

      const expected = `Hardhat version ${packageJson.version}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

AVAILABLE TASKS:

  task1                    task1 description
  task2                    task2 description

GLOBAL OPTIONS:

  --config                 A Hardhat config file.
  --help                   Shows this message, or a task's help if its name is provided
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
            namedParameters: new Map(),
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
            namedParameters: new Map(),
            positionalParameters: [],
            pluginId: "task2-plugin-id",
            subtasks: new Map(),
            isEmpty: false,
            run: async () => {},
          },
        ],
      ]);

      const help = await getGlobalHelpString(tasks);

      const expected = `Hardhat version ${packageJson.version}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]

AVAILABLE TASKS:

  task1                    task1 description
  task2                    task2 description

AVAILABLE SUBTASKS:

  task1 subtask1           subtask1 description

GLOBAL OPTIONS:

  --config                 A Hardhat config file.
  --help                   Shows this message, or a task's help if its name is provided
  --show-stack-traces      Show stack traces (always enabled on CI servers).
  --version                Shows hardhat's version.

To get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

      assert.equal(help, expected);
    });
  });
});

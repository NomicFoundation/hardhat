import type { Task } from "../../../../src/types/tasks.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import chalk from "chalk";

import { globalOption } from "../../../../src/config.js";
import { getHelpString } from "../../../../src/internal/cli/help/get-help-string.js";
import { ArgumentType } from "../../../../src/types/arguments.js";

describe("getHelpString", function () {
  describe("when the task is empty", function () {
    it("should return the task's help string", async function () {
      const task: Task = {
        id: ["task"],
        description: "task description",
        actions: [{ pluginId: "task-plugin-id", action: () => {} }],
        options: new Map(),
        positionalArguments: [],
        pluginId: "task-plugin-id",
        subtasks: new Map().set("subtask", {
          id: ["task", "subtask"],
          description: "An example empty subtask task",
          isEmpty: false,
          run: async () => {},
        }),
        isEmpty: true,
        run: async () => {},
      };

      const globalOptionDefinitions = new Map([
        [
          "userOption1",
          {
            pluginId: "builtin",
            option: globalOption({
              name: "userOption1",
              description: "userOption1 description.",
              type: ArgumentType.STRING,
              defaultValue: "default",
            }),
          },
        ],
        [
          "userOption2",
          {
            pluginId: "builtin",
            option: globalOption({
              name: "userOption2",
              shortName: "o",
              description: "userOption2 description.",
              type: ArgumentType.STRING,
              defaultValue: "default",
            }),
          },
        ],
      ]);

      const help = await getHelpString(task, globalOptionDefinitions);

      const expected = `${chalk.bold("task description")}

Usage: hardhat [GLOBAL OPTIONS] task <SUBTASK> [SUBTASK OPTIONS] [--] [SUBTASK POSITIONAL ARGUMENTS]

AVAILABLE SUBTASKS:

  task subtask             An example empty subtask task

GLOBAL OPTIONS:

  --user-option-1          userOption1 description.
  --user-option-2, -o      userOption2 description.

To get help for a specific task run: npx hardhat task <SUBTASK> --help`;

      assert.equal(help, expected);
    });
  });

  describe("when the task is not empty", function () {
    describe("when there are options", function () {
      it("should return the task's help string with options sorted by name", async function () {
        const task: Task = {
          id: ["task"],
          description: "task description",
          actions: [{ pluginId: "task-plugin-id", action: () => {} }],
          options: new Map()
            .set("option", {
              name: "option",
              description: "An example option",
              type: ArgumentType.STRING,
            })
            .set("anotherOption", {
              name: "anotherOption",
              description: "Another example option",
              type: ArgumentType.FLAG,
            }),
          positionalArguments: [],
          pluginId: "task-plugin-id",
          subtasks: new Map(),
          isEmpty: false,
          run: async () => {},
        };

        const globalOptionDefinitions = new Map();

        const help = await getHelpString(task, globalOptionDefinitions);

        const expected = `${chalk.bold("task description")}

Usage: hardhat [GLOBAL OPTIONS] task [--another-option] [--option <STRING>]

OPTIONS:

  --another-option      Another example option
  --option              An example option

GLOBAL OPTIONS:


`;

        assert.equal(help, expected);
      });
    });

    describe("when there are positional arguments", function () {
      it("should return the task's help string with options and positional arguments sorted by name, except in the usage string", async function () {
        const task: Task = {
          id: ["task"],
          description: "task description",
          actions: [{ pluginId: "task-plugin-id", action: () => {} }],
          options: new Map()
            .set("option", {
              name: "option",
              description: "An example option",
              type: ArgumentType.STRING,
            })
            .set("anotherOption", {
              name: "anotherOption",
              description: "Another example option",
              type: ArgumentType.FLAG,
            }),
          positionalArguments: [
            {
              name: "positionalArgument",
              description: "An example positional argument",
              type: ArgumentType.STRING,
              isVariadic: false,
            },
            {
              name: "anotherPositionalArgument",
              description: "Another example positional argument",
              type: ArgumentType.STRING,
              isVariadic: false,
            },
          ],
          pluginId: "task-plugin-id",
          subtasks: new Map(),
          isEmpty: false,
          run: async () => {},
        };

        const globalOptionDefinitions = new Map();

        const help = await getHelpString(task, globalOptionDefinitions);

        const expected = `${chalk.bold("task description")}

Usage: hardhat [GLOBAL OPTIONS] task [--another-option] [--option <STRING>] [--] positionalArgument anotherPositionalArgument

OPTIONS:

  --another-option               Another example option
  --option                       An example option

POSITIONAL ARGUMENTS:

  anotherPositionalArgument      Another example positional argument
  positionalArgument             An example positional argument

GLOBAL OPTIONS:


`;

        assert.equal(help, expected);
      });
    });

    describe("when there are subtasks", function () {
      it("should return the task's help string with subtasks sorted by name", async function () {
        const task: Task = {
          id: ["task"],
          description: "task description",
          actions: [{ pluginId: "task-plugin-id", action: () => {} }],
          options: new Map()
            .set("option", {
              name: "option",
              description: "An example option",
              type: ArgumentType.STRING,
            })
            .set("anotherOption", {
              name: "anotherOption",
              description: "Another example option",
              type: ArgumentType.FLAG,
            }),
          positionalArguments: [
            {
              name: "positionalArgument",
              description: "An example positional argument",
              type: ArgumentType.STRING,
              isVariadic: false,
            },
          ],
          pluginId: "task-plugin-id",
          subtasks: new Map()
            .set("subtask", {
              id: ["task", "subtask"],
              description: "An example subtask",
            })
            .set("another-subtask", {
              id: ["task", "another-subtask"],
              description: "Another example subtask",
            }),
          isEmpty: false,
          run: async () => {},
        };

        const globalOptionDefinitions = new Map();

        const help = await getHelpString(task, globalOptionDefinitions);

        const expected = `${chalk.bold("task description")}

Usage: hardhat [GLOBAL OPTIONS] task [--another-option] [--option <STRING>] [--] positionalArgument

OPTIONS:

  --another-option          Another example option
  --option                  An example option

POSITIONAL ARGUMENTS:

  positionalArgument        An example positional argument

AVAILABLE SUBTASKS:

  task another-subtask      Another example subtask
  task subtask              An example subtask

GLOBAL OPTIONS:


`;

        assert.equal(help, expected);
      });
    });
  });
});

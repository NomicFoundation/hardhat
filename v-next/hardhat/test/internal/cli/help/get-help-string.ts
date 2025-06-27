import type { Task } from "../../../../src/types/tasks.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import chalk from "chalk";

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

      const help = await getHelpString(task);

      const expected = `${chalk.bold("task description")}

Usage: hardhat [GLOBAL OPTIONS] task <SUBTASK> [SUBTASK OPTIONS] [--] [SUBTASK POSITIONAL ARGUMENTS]

AVAILABLE SUBTASKS:

  task subtask      An example empty subtask task

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

        const help = await getHelpString(task);

        const expected = `${chalk.bold("task description")}

Usage: hardhat [GLOBAL OPTIONS] task [--another-option] [--option <STRING>]

OPTIONS:

  --another-option      Another example option
  --option              An example option

For global options help run: hardhat --help`;

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

        const help = await getHelpString(task);

        const expected = `${chalk.bold("task description")}

Usage: hardhat [GLOBAL OPTIONS] task [--another-option] [--option <STRING>] [--] positionalArgument anotherPositionalArgument

OPTIONS:

  --another-option               Another example option
  --option                       An example option

POSITIONAL ARGUMENTS:

  anotherPositionalArgument      Another example positional argument
  positionalArgument             An example positional argument

For global options help run: hardhat --help`;

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

        const help = await getHelpString(task);

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

For global options help run: hardhat --help`;

        assert.equal(help, expected);
      });
    });
  });
});

import type { Task } from "@nomicfoundation/hardhat-core/types/tasks";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ParameterType } from "@nomicfoundation/hardhat-core/config";
import chalk from "chalk";

import { getHelpString } from "../../../../../src/internal/cli/helpers/getHelpString.js";

describe("getHelpString", function () {
  describe("when the task is empty", function () {
    it("should return the task's help string", async function () {
      const task: Task = {
        id: ["task"],
        description: "task description",
        actions: [{ pluginId: "task-plugin-id", action: () => {} }],
        options: new Map(),
        positionalParameters: [],
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
      it("should return the task's help string", async function () {
        const task: Task = {
          id: ["task"],
          description: "task description",
          actions: [{ pluginId: "task-plugin-id", action: () => {} }],
          options: new Map()
            .set("option", {
              name: "option",
              description: "An example option",
              parameterType: "STRING",
            })
            .set("anotherOption", {
              name: "anotherOption",
              description: "Another example option",
              parameterType: "BOOLEAN",
            }),
          positionalParameters: [],
          pluginId: "task-plugin-id",
          subtasks: new Map(),
          isEmpty: false,
          run: async () => {},
        };

        const help = await getHelpString(task);

        const expected = `${chalk.bold("task description")}

Usage: hardhat [GLOBAL OPTIONS] task [--option <STRING>] [--another-option]

OPTIONS:

  --option              An example option
  --another-option      Another example option

For global options help run: hardhat --help`;

        assert.equal(help, expected);
      });
    });

    describe("when there are positional arguments", function () {
      it("should return the task's help string", async function () {
        const task: Task = {
          id: ["task"],
          description: "task description",
          actions: [{ pluginId: "task-plugin-id", action: () => {} }],
          options: new Map()
            .set("option", {
              name: "option",
              description: "An example option",
              parameterType: "STRING",
            })
            .set("anotherOption", {
              name: "anotherOption",
              description: "Another example option",
              parameterType: "BOOLEAN",
            }),
          positionalParameters: [
            {
              name: "positionalArgument",
              description: "An example positional argument",
              parameterType: ParameterType.STRING,
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

Usage: hardhat [GLOBAL OPTIONS] task [--option <STRING>] [--another-option] [--] positionalArgument

OPTIONS:

  --option                An example option
  --another-option        Another example option

POSITIONAL ARGUMENTS:

  positionalArgument      An example positional argument

For global options help run: hardhat --help`;

        assert.equal(help, expected);
      });
    });

    describe("when there are subtasks", function () {
      it("should return the task's help string", async function () {
        const task: Task = {
          id: ["task"],
          description: "task description",
          actions: [{ pluginId: "task-plugin-id", action: () => {} }],
          options: new Map()
            .set("option", {
              name: "option",
              description: "An example option",
              parameterType: "STRING",
            })
            .set("anotherOption", {
              name: "anotherOption",
              description: "Another example option",
              parameterType: "BOOLEAN",
            }),
          positionalParameters: [
            {
              name: "positionalArgument",
              description: "An example positional argument",
              parameterType: ParameterType.STRING,
              isVariadic: false,
            },
          ],
          pluginId: "task-plugin-id",
          subtasks: new Map().set("subtask", {
            id: ["task", "subtask"],
            description: "An example subtask",
          }),
          isEmpty: false,
          run: async () => {},
        };

        const help = await getHelpString(task);

        const expected = `${chalk.bold("task description")}

Usage: hardhat [GLOBAL OPTIONS] task [--option <STRING>] [--another-option] [--] positionalArgument

OPTIONS:

  --option                An example option
  --another-option        Another example option

POSITIONAL ARGUMENTS:

  positionalArgument      An example positional argument

AVAILABLE SUBTASKS:

  task subtask            An example subtask

For global options help run: hardhat --help`;

        assert.equal(help, expected);
      });
    });
  });
});

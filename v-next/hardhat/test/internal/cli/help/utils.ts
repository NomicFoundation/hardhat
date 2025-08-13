import type { Task } from "../../../../src/types/tasks.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseTasks,
  parseSubtasks,
  parseOptions,
  toCommandLineOption,
  getLongestNameLength,
  getSection,
  getUsageString,
  toShortCommandLineOption,
} from "../../../../src/internal/cli/help/utils.js";
import { ArgumentType } from "../../../../src/types/arguments.js";

describe("utils", function () {
  describe("parseTasks", function () {
    it("should return tasks and subtasks", function () {
      const task: Task = {
        id: ["task"],
        description: "task description",
        actions: [
          {
            pluginId: "task-plugin-id",
            action: async () => ({
              default: () => {},
            }),
          },
        ],
        options: new Map(),
        positionalArguments: [],
        pluginId: "task-plugin-id",
        subtasks: new Map().set("subtask", {
          id: ["task", "subtask"],
          description: "An example empty subtask task",
          isEmpty: false,
          run: async () => {},
        }),
        isEmpty: false,
        run: async () => {},
      };

      const result = parseTasks(new Map().set("task", task));

      assert.deepEqual(result, {
        tasks: [{ name: "task", description: "task description" }],
        subtasks: [
          {
            name: "task subtask",
            description: "An example empty subtask task",
          },
        ],
      });
    });

    it("should not include empty tasks in the tasks list", function () {
      const task: Task = {
        id: ["task"],
        description: "task description",
        actions: [
          {
            pluginId: "task-plugin-id",
            action: async () => ({
              default: () => {},
            }),
          },
        ],
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

      const result = parseTasks(new Map().set("task", task));

      assert.deepEqual(result, {
        tasks: [],
        subtasks: [
          {
            name: "task subtask",
            description: "An example empty subtask task",
          },
        ],
      });
    });
  });

  describe("parseSubtasks", function () {
    it("should return subtasks", function () {
      const task: Task = {
        id: ["task"],
        description: "task description",
        actions: [
          {
            pluginId: "task-plugin-id",
            action: async () => ({
              default: () => {},
            }),
          },
        ],
        options: new Map(),
        positionalArguments: [],
        pluginId: "task-plugin-id",
        subtasks: new Map().set("subtask", {
          id: ["task", "subtask"],
          description: "An example empty subtask task",
          isEmpty: false,
          run: async () => {},
        }),
        isEmpty: false,
        run: async () => {},
      };

      const result = parseSubtasks(task);

      assert.deepEqual(result, [
        {
          name: "task subtask",
          description: "An example empty subtask task",
        },
      ]);
    });
  });

  describe("parseOptions", function () {
    it("should return options and positional arguments", function () {
      const task: Task = {
        id: ["task"],
        description: "task description",
        actions: [
          {
            pluginId: "task-plugin-id",
            action: async () => ({
              default: () => {},
            }),
          },
        ],
        options: new Map()
          .set("option", {
            name: "option",
            shortName: "o",
            description: "An example option",
            type: ArgumentType.STRING,
          })
          .set("anotherOption", {
            name: "anotherOption",
            description: "Another example option",
            type: ArgumentType.BOOLEAN,
          }),
        positionalArguments: [
          {
            name: "positionalArgument",
            description: "An example argument",
            type: ArgumentType.STRING,
            isVariadic: false,
          },
          {
            name: "anotherPositionalArgument",
            description: "Another example argument",
            type: ArgumentType.STRING,
            isVariadic: false,
            defaultValue: "default",
          },
        ],
        pluginId: "task-plugin-id",
        subtasks: new Map(),
        isEmpty: false,
        run: async () => {},
      };

      const result = parseOptions(task);

      assert.deepEqual(result, {
        options: [
          {
            name: "--option",
            shortName: "-o",
            description: "An example option",
            type: "STRING",
          },
          {
            name: "--another-option",
            shortName: undefined,
            description: "Another example option",
            type: "BOOLEAN",
          },
        ],
        positionalArguments: [
          {
            name: "positionalArgument",
            description: "An example argument",
            isRequired: true,
          },
          {
            name: "anotherPositionalArgument",
            description: "Another example argument",
            isRequired: false,
            defaultValue: "default",
          },
        ],
      });
    });
  });

  describe("toCommandLineOption", function () {
    it("should convert a camelCase option name to a kebab-case command line option", function () {
      assert.equal(toCommandLineOption("option"), "--option");
      assert.equal(toCommandLineOption("anotherOption"), "--another-option");
      assert.equal(toCommandLineOption("anotherOption1"), "--another-option-1");
    });
  });

  describe("toShortCommandLineOption", function () {
    it("should parse the short command line option", function () {
      assert.equal(toShortCommandLineOption("a"), "-a");
      assert.equal(toShortCommandLineOption("b"), "-b");
      assert.equal(toShortCommandLineOption("c"), "-c");
    });
  });

  describe("getLongestNameLength", function () {
    it("should return the length of the longest name", function () {
      assert.equal(
        getLongestNameLength([{ name: "name" }, { name: "anotherName" }]),
        11,
      );
    });

    it("should return the length of the longest name with short names", function () {
      assert.equal(
        getLongestNameLength([
          { name: "name", shortName: "n" },
          { name: "anotherName", shortName: "a" },
        ]),
        14,
      );
    });
  });

  describe("getSection", function () {
    it("should return a section with items sorted by name", function () {
      const section = getSection(
        "Section Title",
        [
          { name: "content", description: "content description" },
          { name: "content2", description: "content description2" },
          { name: "content3", description: "content description3" },
          { name: "another-item", description: "content description4" },
        ],
        18,
      );

      const expected = `
Section Title:

  another-item      content description4
  content           content description
  content2          content description2
  content3          content description3
`;

      assert.equal(section, expected);
    });
  });

  describe("getUsageString", function () {
    describe("with a required positional argument", function () {
      it("should return a usage string with options sorted by name, preserving positional argument order", function () {
        const task: Task = {
          id: ["task"],
          description: "task description",
          actions: [
            {
              pluginId: "task-plugin-id",
              action: async () => ({
                default: () => {},
              }),
            },
          ],
          options: new Map()
            .set("option", {
              name: "option",
              shortName: "o",
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
              description: "An example argument",
              type: ArgumentType.STRING,
              isVariadic: false,
            },
            {
              name: "anotherPositionalArgument",
              description: "Another example argument",
              type: ArgumentType.STRING,
              isVariadic: false,
            },
          ],
          pluginId: "task-plugin-id",
          subtasks: new Map(),
          isEmpty: false,
          run: async () => {},
        };

        const usageString = getUsageString(
          task,
          [
            {
              name: "--option",
              shortName: "-o",
              description: "An example option",
              type: ArgumentType.STRING,
            },
            {
              name: "--another-option",
              description: "Another example option",
              type: ArgumentType.FLAG,
            },
          ],
          [
            {
              name: "positionalArgument",
              description: "An example argument",
              isRequired: true,
            },
            {
              name: "anotherPositionalArgument",
              description: "Another example argument",
              isRequired: true,
            },
          ],
        );

        const expected = `Usage: hardhat [GLOBAL OPTIONS] task [--another-option] [--option <STRING>] [--] positionalArgument anotherPositionalArgument`;

        assert.equal(usageString, expected);
      });
    });

    describe("with an optional positional argument", function () {
      it("should return a usage string with options sorted by name, preserving positional argument order", function () {
        const task: Task = {
          id: ["task"],
          description: "task description",
          actions: [
            {
              pluginId: "task-plugin-id",
              action: async () => ({
                default: () => {},
              }),
            },
          ],
          options: new Map()
            .set("option", {
              name: "option",
              shortName: "o",
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
              description: "An example argument",
              type: ArgumentType.STRING,
              isVariadic: false,
            },
            {
              name: "anotherPositionalArgument",
              description: "Another example argument",
              type: ArgumentType.STRING,
              isVariadic: false,
            },
          ],
          pluginId: "task-plugin-id",
          subtasks: new Map(),
          isEmpty: false,
          run: async () => {},
        };

        const usageString = getUsageString(
          task,
          [
            {
              name: "--option",
              shortName: "-o",
              description: "An example option",
              type: ArgumentType.STRING,
            },
            {
              name: "--another-option",
              description: "Another example option",
              type: ArgumentType.FLAG,
            },
          ],
          [
            {
              name: "positionalArgument",
              description: "An example argument",
              isRequired: false,
            },
            {
              name: "anotherPositionalArgument",
              description: "Another example argument",
              isRequired: false,
            },
          ],
        );

        const expected = `Usage: hardhat [GLOBAL OPTIONS] task [--another-option] [--option <STRING>] [--] [positionalArgument] [anotherPositionalArgument]`;

        assert.equal(usageString, expected);
      });
    });
  });
});

import type { Task } from "@ignored/hardhat-vnext-core/types/tasks";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ArgumentType } from "@ignored/hardhat-vnext-core/config";

import {
  parseTasks,
  parseSubtasks,
  parseOptions,
  formatOptionName,
  getLongestNameLength,
  getSection,
  getUsageString,
} from "../../../../src/internal/cli/helpers/utils.js";

describe("utils", function () {
  describe("parseTasks", function () {
    it("should return tasks and subtasks", function () {
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
            description: "An example option",
            type: "STRING",
          },
          {
            name: "--another-option",
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
          },
        ],
      });
    });
  });

  describe("formatOptionName", function () {
    it("should format option names", function () {
      assert.equal(formatOptionName("option"), "--option");
      assert.equal(formatOptionName("anotherOption"), "--another-option");
    });
  });

  describe("getLongestNameLength", function () {
    it("should return the length of the longest name", function () {
      assert.equal(
        getLongestNameLength([{ name: "name" }, { name: "anotherName" }]),
        11,
      );
    });
  });

  describe("getSection", function () {
    it("should return a section", function () {
      const section = getSection(
        "Section Title",
        [
          { name: "content", description: "content description" },
          { name: "content2", description: "content description2" },
          { name: "content3", description: "content description3" },
        ],
        14,
      );

      const expected = `
Section Title:

  content       content description
  content2      content description2
  content3      content description3
`;

      assert.equal(section, expected);
    });
  });

  describe("getUsageString", function () {
    describe("with a required positional argument", function () {
      it("should return a usage string", function () {
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
              type: ArgumentType.BOOLEAN,
            }),
          positionalArguments: [
            {
              name: "positionalArgument",
              description: "An example argument",
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
              description: "An example option",
              type: ArgumentType.STRING,
            },
            {
              name: "--another-option",
              description: "Another example option",
              type: ArgumentType.BOOLEAN,
            },
          ],
          [
            {
              name: "positionalArgument",
              description: "An example argument",
              isRequired: true,
            },
          ],
        );

        const expected = `Usage: hardhat [GLOBAL OPTIONS] task [--option <STRING>] [--another-option] [--] positionalArgument`;

        assert.equal(usageString, expected);
      });
    });

    describe("with an optional positional argument", function () {
      it("should return a usage string", function () {
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
              type: ArgumentType.BOOLEAN,
            }),
          positionalArguments: [
            {
              name: "positionalArgument",
              description: "An example argument",
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
              description: "An example option",
              type: ArgumentType.STRING,
            },
            {
              name: "--another-option",
              description: "Another example option",
              type: ArgumentType.BOOLEAN,
            },
          ],
          [
            {
              name: "positionalArgument",
              description: "An example argument",
              isRequired: false,
            },
          ],
        );

        const expected = `Usage: hardhat [GLOBAL OPTIONS] task [--option <STRING>] [--another-option] [--] [positionalArgument]`;

        assert.equal(usageString, expected);
      });
    });
  });
});

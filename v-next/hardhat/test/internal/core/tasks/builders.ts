import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  RESERVED_ARGUMENT_NAMES,
  RESERVED_ARGUMENT_SHORT_NAMES,
} from "../../../../src/internal/core/arguments.js";
import {
  EmptyTaskDefinitionBuilderImplementation,
  NewTaskDefinitionBuilderImplementation,
  TaskOverrideDefinitionBuilderImplementation,
} from "../../../../src/internal/core/tasks/builders.js";
import { ArgumentType } from "../../../../src/types/arguments.js";
import { TaskDefinitionType } from "../../../../src/types/tasks.js";

describe("Task builders", () => {
  before(() => {
    // Make sure we have some reserved names
    RESERVED_ARGUMENT_NAMES.add("testName1");
    RESERVED_ARGUMENT_NAMES.add("testName2");
    RESERVED_ARGUMENT_NAMES.add("testName3");
    // Make sure we have some reserved short names
    RESERVED_ARGUMENT_SHORT_NAMES.add("x");
    RESERVED_ARGUMENT_SHORT_NAMES.add("y");
    RESERVED_ARGUMENT_SHORT_NAMES.add("z");
  });

  after(() => {
    // Delete the test reserved names
    RESERVED_ARGUMENT_NAMES.delete("testName1");
    RESERVED_ARGUMENT_NAMES.delete("testName2");
    RESERVED_ARGUMENT_NAMES.delete("testName3");
    // Delete the test reserved short names
    RESERVED_ARGUMENT_SHORT_NAMES.delete("x");
    RESERVED_ARGUMENT_SHORT_NAMES.delete("y");
    RESERVED_ARGUMENT_SHORT_NAMES.delete("z");
  });

  describe("EmptyTaskDefinitionBuilderImplementation", () => {
    it("should create an empty task definition builder", () => {
      const builder = new EmptyTaskDefinitionBuilderImplementation("task-id");
      const taskDefinition = builder.build();

      assert.deepEqual(taskDefinition, {
        type: TaskDefinitionType.EMPTY_TASK,
        id: ["task-id"],
        description: "",
      });
    });

    it("should create an empty task definition builder with an array of ids", () => {
      const ids = ["task-id", "subtask-id", "sub-subtask-id"];
      const builder = new EmptyTaskDefinitionBuilderImplementation(ids);
      const taskDefinition = builder.build();

      assert.deepEqual(taskDefinition, {
        type: TaskDefinitionType.EMPTY_TASK,
        id: ids,
        description: "",
      });
    });

    describe("Task id validation", () => {
      it("should throw if the id is an empty string", () => {
        assertThrowsHardhatError(
          () => new EmptyTaskDefinitionBuilderImplementation(""),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.EMPTY_TASK_ID,
          {},
        );
      });

      it("should throw if the array of ids is empty", () => {
        const ids: string[] = [];

        assertThrowsHardhatError(
          () => new EmptyTaskDefinitionBuilderImplementation(ids),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.EMPTY_TASK_ID,
          {},
        );
      });
    });

    describe("Adding a description", () => {
      it("should create an empty task definition builder with a description in the constructor", () => {
        const builder = new EmptyTaskDefinitionBuilderImplementation(
          "task-id",
          "Task description",
        );
        const taskDefinition = builder.build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.EMPTY_TASK,
          id: ["task-id"],
          description: "Task description",
        });
      });
    });
  });

  describe("NewTaskDefinitionBuilderImplementation", () => {
    it("should create a new task definition builder", () => {
      const builder = new NewTaskDefinitionBuilderImplementation("task-id");
      const taskAction = () => {};
      const taskDefinition = builder.setAction(taskAction).build();

      assert.deepEqual(taskDefinition, {
        type: TaskDefinitionType.NEW_TASK,
        id: ["task-id"],
        description: "",
        action: taskAction,
        options: {},
        positionalArguments: [],
      });
    });

    it("should create a new task definition builder with an array of ids", () => {
      const ids = ["task-id", "subtask-id", "sub-subtask-id"];
      const builder = new NewTaskDefinitionBuilderImplementation(ids);
      const taskAction = () => {};
      const taskDefinition = builder.setAction(taskAction).build();

      assert.deepEqual(taskDefinition, {
        type: TaskDefinitionType.NEW_TASK,
        id: ids,
        description: "",
        action: taskAction,
        options: {},
        positionalArguments: [],
      });
    });

    describe("Task id validation", () => {
      it("should throw if the id is an empty string", () => {
        assertThrowsHardhatError(
          () => new NewTaskDefinitionBuilderImplementation(""),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.EMPTY_TASK_ID,
          {},
        );
      });

      it("should throw if the array of ids is empty", () => {
        const ids: string[] = [];

        assertThrowsHardhatError(
          () => new NewTaskDefinitionBuilderImplementation(ids),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.EMPTY_TASK_ID,
          {},
        );
      });
    });

    describe("Adding an action", () => {
      it("should create a new task definition builder with an async function action", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = async () => {};
        const taskDefinition = builder.setAction(taskAction).build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalArguments: [],
        });
      });

      it("should create a new task definition builder with a string action", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = "file://path/to/task-action.js";
        const taskDefinition = builder.setAction(taskAction).build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalArguments: [],
        });
      });

      it("should throw when trying to build a task definition without an action", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        assertThrowsHardhatError(
          () => builder.build(),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.NO_ACTION,
          {
            task: "task-id",
          },
        );
      });

      it("should throw if the task action is not a valid file URL", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        assertThrowsHardhatError(
          () => builder.setAction("not-a-valid-file-url"),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_FILE_ACTION,
          { action: "not-a-valid-file-url" },
        );
        assertThrowsHardhatError(
          () => builder.setAction("file://"),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_FILE_ACTION,
          {
            action: "file://",
          },
        );
      });
    });

    describe("Adding a description", () => {
      it("should create a new task definition builder with a description in the constructor", () => {
        const builder = new NewTaskDefinitionBuilderImplementation(
          "task-id",
          "Task description",
        );
        const taskAction = () => {};
        const taskDefinition = builder.setAction(taskAction).build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "Task description",
          action: taskAction,
          options: {},
          positionalArguments: [],
        });
      });

      it("should set the task description", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .setDescription("Task description")
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "Task description",
          action: taskAction,
          options: {},
          positionalArguments: [],
        });
      });

      it("should override the description set in the constructor", () => {
        const builder = new NewTaskDefinitionBuilderImplementation(
          "task-id",
          "Task description",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .setDescription("New task description")
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "New task description",
          action: taskAction,
          options: {},
          positionalArguments: [],
        });
      });
    });

    describe("Adding options", () => {
      it("should add an option", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addOption({
            name: "arg",
            defaultValue: "default",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {
            arg: {
              name: "arg",
              shortName: undefined,
              description: "",
              type: ArgumentType.STRING,
              defaultValue: "default",
            },
          },
          positionalArguments: [],
        });
      });

      it("should add an option with a description", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addOption({
            name: "arg",
            description: "Argument description",
            defaultValue: "default",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {
            arg: {
              name: "arg",
              shortName: undefined,
              description: "Argument description",
              type: ArgumentType.STRING,
              defaultValue: "default",
            },
          },
          positionalArguments: [],
        });
      });

      it("should add an option with a type", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addOption({
            name: "arg",
            type: ArgumentType.INT,
            defaultValue: 1,
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {
            arg: {
              name: "arg",
              shortName: undefined,
              description: "",
              type: ArgumentType.INT,
              defaultValue: 1,
            },
          },
          positionalArguments: [],
        });
      });

      it("should add an option with a short name", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addOption({
            name: "arg",
            shortName: "a",
            defaultValue: "default",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {
            arg: {
              name: "arg",
              shortName: "a",
              description: "",
              type: ArgumentType.STRING,
              defaultValue: "default",
            },
          },
          positionalArguments: [],
        });
      });
    });

    describe("Adding flags", () => {
      it("should add a flag", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addFlag({ name: "flag" })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {
            flag: {
              name: "flag",
              shortName: undefined,
              description: "",
              type: ArgumentType.BOOLEAN,
              defaultValue: false,
            },
          },
          positionalArguments: [],
        });
      });

      it("should add a flag with a description", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addFlag({ name: "flag", description: "Flag description" })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {
            flag: {
              name: "flag",
              shortName: undefined,
              description: "Flag description",
              type: ArgumentType.BOOLEAN,
              defaultValue: false,
            },
          },
          positionalArguments: [],
        });
      });

      it("should add a flag with a short name", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addFlag({ name: "flag", shortName: "f" })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {
            flag: {
              name: "flag",
              shortName: "f",
              description: "",
              type: ArgumentType.BOOLEAN,
              defaultValue: false,
            },
          },
          positionalArguments: [],
        });
      });
    });

    describe("Adding positional arguments", () => {
      it("should add a positional argument", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addPositionalArgument({ name: "arg" })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalArguments: [
            {
              name: "arg",
              description: "",
              type: ArgumentType.STRING,
              defaultValue: undefined,
              isVariadic: false,
            },
          ],
        });
      });

      it("should add a positional argument with a description", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addPositionalArgument({
            name: "arg",
            description: "Argument description",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalArguments: [
            {
              name: "arg",
              description: "Argument description",
              type: ArgumentType.STRING,
              defaultValue: undefined,
              isVariadic: false,
            },
          ],
        });
      });

      it("should add a positional argument with a default value", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addPositionalArgument({
            name: "arg",
            defaultValue: "default",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalArguments: [
            {
              name: "arg",
              description: "",
              type: ArgumentType.STRING,
              defaultValue: "default",
              isVariadic: false,
            },
          ],
        });
      });

      it("should add a positional argument with a type", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addPositionalArgument({
            name: "arg",
            type: ArgumentType.INT,
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalArguments: [
            {
              name: "arg",
              description: "",
              type: ArgumentType.INT,
              defaultValue: undefined,
              isVariadic: false,
            },
          ],
        });
      });
    });

    describe("Adding variadic arguments", () => {
      it("should add a variadic argument", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addVariadicArgument({ name: "arg" })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalArguments: [
            {
              name: "arg",
              description: "",
              type: ArgumentType.STRING,
              defaultValue: undefined,
              isVariadic: true,
            },
          ],
        });
      });

      it("should add a variadic argument with a description", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addVariadicArgument({
            name: "arg",
            description: "Argument description",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalArguments: [
            {
              name: "arg",
              description: "Argument description",
              type: ArgumentType.STRING,
              defaultValue: undefined,
              isVariadic: true,
            },
          ],
        });
      });

      it("should add a variadic argument with a default value", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addVariadicArgument({
            name: "arg",
            defaultValue: ["default1", "default2"],
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalArguments: [
            {
              name: "arg",
              description: "",
              type: ArgumentType.STRING,
              defaultValue: ["default1", "default2"],
              isVariadic: true,
            },
          ],
        });
      });

      it("should add a variadic argument with a type", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addVariadicArgument({ name: "arg", type: ArgumentType.INT })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalArguments: [
            {
              name: "arg",
              description: "",
              type: ArgumentType.INT,
              defaultValue: undefined,
              isVariadic: true,
            },
          ],
        });
      });
    });

    describe("Argument name validation", () => {
      it("should throw if the argument name is invalid", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        const invalidNames = ["invalid-name", "invalid_name", "123invalidName"];

        invalidNames.forEach((name) => {
          assertThrowsHardhatError(
            () =>
              builder.addOption({
                name,
                defaultValue: "default",
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_NAME,
            {
              name,
            },
          );

          assertThrowsHardhatError(
            () =>
              builder.addFlag({
                name,
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_NAME,
            {
              name,
            },
          );

          assertThrowsHardhatError(
            () =>
              builder.addPositionalArgument({
                name,
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_NAME,
            {
              name,
            },
          );

          assertThrowsHardhatError(
            () =>
              builder.addVariadicArgument({
                name,
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_NAME,
            {
              name,
            },
          );
        });
      });

      it("should throw if the argument name is already in use", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        builder
          .addOption({ name: "option", defaultValue: "default" })
          .addFlag({ name: "flag" })
          .addPositionalArgument({ name: "posArg" })
          .addVariadicArgument({ name: "varArg" });

        const names = ["option", "flag", "posArg", "varArg"];

        names.forEach((name) => {
          assertThrowsHardhatError(
            () => builder.addOption({ name, defaultValue: "default" }),
            HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
            {
              name,
            },
          );

          assertThrowsHardhatError(
            () => builder.addFlag({ name }),
            HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
            {
              name,
            },
          );

          assertThrowsHardhatError(
            () => builder.addPositionalArgument({ name }),
            HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
            {
              name,
            },
          );

          assertThrowsHardhatError(
            () => builder.addVariadicArgument({ name }),
            HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
            {
              name,
            },
          );
        });
      });

      it("should throw if the argument name is reserved", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        RESERVED_ARGUMENT_NAMES.forEach((name) => {
          assertThrowsHardhatError(
            () => builder.addOption({ name, defaultValue: "default" }),
            HardhatError.ERRORS.CORE.ARGUMENTS.RESERVED_NAME,
            {
              name,
            },
          );
        });
      });
    });

    describe("Argument short name validation", () => {
      it("should throw if the short name is invalid", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        const invalidShortNames = ["", "ab", "1"];

        invalidShortNames.forEach((shortName) => {
          assertThrowsHardhatError(
            () =>
              builder.addOption({
                name: "arg1",
                shortName,
                defaultValue: "default",
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_NAME,
            {
              name: shortName,
            },
          );

          assertThrowsHardhatError(
            () =>
              builder.addFlag({
                name: "flag1",
                shortName,
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_NAME,
            {
              name: shortName,
            },
          );
        });
      });

      it("should throw if the short name is already in use", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        builder
          .addOption({
            name: "option",
            shortName: "o",
            defaultValue: "default",
          })
          .addFlag({ name: "flag", shortName: "f" });

        const shortNames = ["o", "f"];

        shortNames.forEach((shortName) => {
          assertThrowsHardhatError(
            () =>
              builder.addOption({
                name: "option1",
                shortName,
                defaultValue: "default",
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
            {
              name: shortName,
            },
          );

          assertThrowsHardhatError(
            () => builder.addFlag({ name: "flag1", shortName }),
            HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
            {
              name: shortName,
            },
          );
        });
      });

      it("should throw if the short name is reserved", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        RESERVED_ARGUMENT_SHORT_NAMES.forEach((shortName) => {
          assertThrowsHardhatError(
            () =>
              builder.addOption({
                name: "option",
                shortName,
                defaultValue: "default",
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.RESERVED_NAME,
            {
              name: shortName,
            },
          );
        });
      });
    });

    describe("Argument type validation", () => {
      it("should throw if the default value does not match the type", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        const fnNames = ["addOption", "addPositionalArgument"] as const;

        fnNames.forEach((fnName) => {
          assertThrowsHardhatError(
            () =>
              builder[fnName]({
                name: "arg",
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
                Intentionally testing an invalid type */
                defaultValue: 123 as any,
                type: ArgumentType.STRING,
              }),
            HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
            {
              value: 123,
              name: "defaultValue",
              type: ArgumentType.STRING,
              task: "task-id",
            },
          );
        });

        assertThrowsHardhatError(
          () =>
            builder.addVariadicArgument({
              name: "arg",
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
              Intentionally testing an invalid type */
              defaultValue: [123, 456, 789] as any,
              type: ArgumentType.STRING,
            }),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
          {
            value: [123, 456, 789],
            name: "defaultValue",
            type: ArgumentType.STRING,
            task: "task-id",
          },
        );
      });
    });

    describe("Positional argument validation", () => {
      it("should throw if trying to add a required positional argument after an optional one", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        builder.addPositionalArgument({
          name: "arg",
          defaultValue: "default",
        });

        assertThrowsHardhatError(
          () => builder.addPositionalArgument({ name: "arg2" }),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.REQUIRED_ARG_AFTER_OPTIONAL,
          { name: "arg2" },
        );
        assertThrowsHardhatError(
          () => builder.addVariadicArgument({ name: "arg3" }),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.REQUIRED_ARG_AFTER_OPTIONAL,
          { name: "arg3" },
        );
      });

      it("should throw if trying to add a positional argument after a variadic one", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        builder.addVariadicArgument({ name: "arg" });

        assertThrowsHardhatError(
          () => builder.addPositionalArgument({ name: "arg2" }),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS
            .POSITIONAL_ARG_AFTER_VARIADIC,
          { name: "arg2" },
        );

        assertThrowsHardhatError(
          () => builder.addVariadicArgument({ name: "arg3" }),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS
            .POSITIONAL_ARG_AFTER_VARIADIC,
          { name: "arg3" },
        );
      });
    });
  });

  describe("TaskOverrideDefinitionBuilderImplementation", () => {
    it("should create a task override definition builder", () => {
      const builder = new TaskOverrideDefinitionBuilderImplementation(
        "task-id",
      );
      const taskAction = () => {};
      const taskDefinition = builder.setAction(taskAction).build();

      assert.deepEqual(taskDefinition, {
        type: TaskDefinitionType.TASK_OVERRIDE,
        id: ["task-id"],
        description: undefined,
        action: taskAction,
        options: {},
      });
    });

    it("should create a task override definition builder with an array of ids", () => {
      const ids = ["task-id", "subtask-id", "sub-subtask-id"];
      const builder = new TaskOverrideDefinitionBuilderImplementation(ids);
      const taskAction = () => {};
      const taskDefinition = builder.setAction(taskAction).build();

      assert.deepEqual(taskDefinition, {
        type: TaskDefinitionType.TASK_OVERRIDE,
        id: ids,
        description: undefined,
        action: taskAction,
        options: {},
      });
    });

    describe("Task id validation", () => {
      it("should throw if the id is an empty string", () => {
        assertThrowsHardhatError(
          () => new TaskOverrideDefinitionBuilderImplementation(""),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.EMPTY_TASK_ID,
          {},
        );
      });

      it("should throw if the array of ids is empty", () => {
        const ids: string[] = [];

        assertThrowsHardhatError(
          () => new TaskOverrideDefinitionBuilderImplementation(ids),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.EMPTY_TASK_ID,
          {},
        );
      });
    });

    describe("Adding an action", () => {
      it("should create a task override definition builder with an async function action", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = async () => {};
        const taskDefinition = builder.setAction(taskAction).build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          options: {},
        });
      });

      it("should create a task override definition builder with a string action", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = "file://path/to/task-action.js";
        const taskDefinition = builder.setAction(taskAction).build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          options: {},
        });
      });

      it("should throw when trying to build a task override definition without an action", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        assertThrowsHardhatError(
          () => builder.build(),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.NO_ACTION,
          {
            task: "task-id",
          },
        );
      });

      it("should throw if the task action is not a valid file URL", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        assertThrowsHardhatError(
          () => builder.setAction("not-a-valid-file-url"),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_FILE_ACTION,
          { action: "not-a-valid-file-url" },
        );
        assertThrowsHardhatError(
          () => builder.setAction("file://"),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_FILE_ACTION,
          { action: "file://" },
        );
      });
    });

    describe("Adding a description", () => {
      it("should set the task description", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .setDescription("Task description")
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: "Task description",
          action: taskAction,
          options: {},
        });
      });
    });

    describe("Adding options", () => {
      it("should add an option", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addOption({
            name: "arg",
            defaultValue: "default",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          options: {
            arg: {
              name: "arg",
              shortName: undefined,
              description: "",
              type: ArgumentType.STRING,
              defaultValue: "default",
            },
          },
        });
      });

      it("should add an option with a description", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addOption({
            name: "arg",
            description: "Argument description",
            defaultValue: "default",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          options: {
            arg: {
              name: "arg",
              shortName: undefined,
              description: "Argument description",
              type: ArgumentType.STRING,
              defaultValue: "default",
            },
          },
        });
      });

      it("should add an option with a type", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addOption({
            name: "arg",
            type: ArgumentType.INT,
            defaultValue: 1,
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          options: {
            arg: {
              name: "arg",
              shortName: undefined,
              description: "",
              type: ArgumentType.INT,
              defaultValue: 1,
            },
          },
        });
      });

      it("should add an option with a short name", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addOption({
            name: "arg",
            shortName: "a",
            description: "",
            type: ArgumentType.INT,
            defaultValue: 1,
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          options: {
            arg: {
              name: "arg",
              shortName: "a",
              description: "",
              type: ArgumentType.INT,
              defaultValue: 1,
            },
          },
        });
      });
    });

    describe("Adding flags", () => {
      it("should add a flag", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addFlag({ name: "flag" })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          options: {
            flag: {
              name: "flag",
              shortName: undefined,
              description: "",
              type: ArgumentType.BOOLEAN,
              defaultValue: false,
            },
          },
        });
      });

      it("should add a flag with a description", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addFlag({ name: "flag", description: "Flag description" })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          options: {
            flag: {
              name: "flag",
              shortName: undefined,
              description: "Flag description",
              type: ArgumentType.BOOLEAN,
              defaultValue: false,
            },
          },
        });
      });

      it("should add a flag with a short name", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addFlag({ name: "flag", shortName: "f" })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          options: {
            flag: {
              name: "flag",
              shortName: "f",
              description: "",
              type: ArgumentType.BOOLEAN,
              defaultValue: false,
            },
          },
        });
      });
    });

    describe("Argument name validation", () => {
      it("should throw if the argument name is invalid", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        const invalidNames = ["invalid-name", "invalid_name", "123invalidName"];

        invalidNames.forEach((name) => {
          assertThrowsHardhatError(
            () =>
              builder.addOption({
                name,
                defaultValue: "default",
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_NAME,
            {
              name,
            },
          );

          assertThrowsHardhatError(
            () =>
              builder.addFlag({
                name,
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_NAME,
            {
              name,
            },
          );
        });
      });

      it("should throw if the argument name is already in use", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        builder
          .addOption({ name: "option", defaultValue: "default" })
          .addFlag({ name: "flag" });

        const names = ["option", "flag"];

        names.forEach((name) => {
          assertThrowsHardhatError(
            () => builder.addOption({ name, defaultValue: "default" }),
            HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
            {
              name,
            },
          );

          assertThrowsHardhatError(
            () => builder.addFlag({ name }),
            HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
            {
              name,
            },
          );
        });
      });

      it("should throw if the argument name is reserved", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        RESERVED_ARGUMENT_NAMES.forEach((name) => {
          assertThrowsHardhatError(
            () => builder.addOption({ name, defaultValue: "default" }),
            HardhatError.ERRORS.CORE.ARGUMENTS.RESERVED_NAME,
            {
              name,
            },
          );
        });
      });
    });

    describe("Argument short name validation", () => {
      it("should throw if the argument name is invalid", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        const invalidNames = ["", "ab", "1"];

        invalidNames.forEach((shortName) => {
          assertThrowsHardhatError(
            () =>
              builder.addOption({
                name: "arg",
                shortName,
                defaultValue: "default",
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_NAME,
            {
              name: shortName,
            },
          );

          assertThrowsHardhatError(
            () =>
              builder.addFlag({
                name: "flag",
                shortName,
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_NAME,
            {
              name: shortName,
            },
          );
        });
      });

      it("should throw if the argument name is already in use", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        builder
          .addOption({
            name: "option",
            shortName: "o",
            defaultValue: "default",
          })
          .addFlag({ name: "flag", shortName: "f" });

        const shortNames = ["o", "f"];

        shortNames.forEach((shortName) => {
          assertThrowsHardhatError(
            () =>
              builder.addOption({
                name: "option1",
                shortName,
                defaultValue: "default",
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
            {
              name: shortName,
            },
          );

          assertThrowsHardhatError(
            () => builder.addFlag({ name: "flag1", shortName }),
            HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
            {
              name: shortName,
            },
          );
        });
      });

      it("should throw if the argument name is reserved", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        RESERVED_ARGUMENT_SHORT_NAMES.forEach((shortName) => {
          assertThrowsHardhatError(
            () =>
              builder.addOption({
                name: "arg",
                shortName,
                defaultValue: "default",
              }),
            HardhatError.ERRORS.CORE.ARGUMENTS.RESERVED_NAME,
            {
              name: shortName,
            },
          );
        });
      });
    });

    describe("Argument type validation", () => {
      it("should throw if the default value does not match the type", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        assertThrowsHardhatError(
          () =>
            builder.addOption({
              name: "arg",
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
              Intentionally testing an invalid type */
              defaultValue: 123 as any,
              type: ArgumentType.STRING,
            }),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
          {
            value: 123,
            name: "defaultValue",
            type: ArgumentType.STRING,
            task: "task-id",
          },
        );
      });
    });
  });
});

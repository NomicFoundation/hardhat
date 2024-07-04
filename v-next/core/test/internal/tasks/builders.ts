import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { RESERVED_PARAMETER_NAMES } from "../../../src/internal/parameters.js";
import {
  EmptyTaskDefinitionBuilderImplementation,
  NewTaskDefinitionBuilderImplementation,
  TaskOverrideDefinitionBuilderImplementation,
} from "../../../src/internal/tasks/builders.js";
import { ArgumentType } from "../../../src/types/arguments.js";
import { TaskDefinitionType } from "../../../src/types/tasks.js";

describe("Task builders", () => {
  before(() => {
    // Make sure we have some reserved names
    RESERVED_PARAMETER_NAMES.add("testName1");
    RESERVED_PARAMETER_NAMES.add("testName2");
    RESERVED_PARAMETER_NAMES.add("testName3");
  });

  after(() => {
    // Delete the test reserved names
    RESERVED_PARAMETER_NAMES.delete("testName1");
    RESERVED_PARAMETER_NAMES.delete("testName2");
    RESERVED_PARAMETER_NAMES.delete("testName3");
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
        assert.throws(
          () => new EmptyTaskDefinitionBuilderImplementation(""),
          new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK_ID),
        );
      });

      it("should throw if the array of ids is empty", () => {
        const ids: string[] = [];

        assert.throws(
          () => new EmptyTaskDefinitionBuilderImplementation(ids),
          new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK_ID),
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

      it("should set the task description", () => {
        const builder = new EmptyTaskDefinitionBuilderImplementation("task-id");
        const taskDefinition = builder
          .setDescription("Task description")
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.EMPTY_TASK,
          id: ["task-id"],
          description: "Task description",
        });
      });

      it("should override the description set in the constructor", () => {
        const builder = new EmptyTaskDefinitionBuilderImplementation(
          "task-id",
          "Task description",
        );
        const taskDefinition = builder
          .setDescription("New task description")
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.EMPTY_TASK,
          id: ["task-id"],
          description: "New task description",
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
        positionalParameters: [],
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
        positionalParameters: [],
      });
    });

    describe("Task id validation", () => {
      it("should throw if the id is an empty string", () => {
        assert.throws(
          () => new NewTaskDefinitionBuilderImplementation(""),
          new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK_ID),
        );
      });

      it("should throw if the array of ids is empty", () => {
        const ids: string[] = [];

        assert.throws(
          () => new NewTaskDefinitionBuilderImplementation(ids),
          new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK_ID),
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
          positionalParameters: [],
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
          positionalParameters: [],
        });
      });

      it("should throw when trying to build a task definition without an action", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        assert.throws(
          () => builder.build(),
          new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.NO_ACTION, {
            task: "task-id",
          }),
        );
      });

      it("should throw if the task action is not a valid file URL", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        assert.throws(
          () => builder.setAction("not-a-valid-file-url"),
          new HardhatError(
            HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_FILE_ACTION,
            { action: "not-a-valid-file-url" },
          ),
        );
        assert.throws(
          () => builder.setAction("file://"),
          new HardhatError(
            HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_FILE_ACTION,
            {
              action: "file://",
            },
          ),
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
          positionalParameters: [],
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
          positionalParameters: [],
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
          positionalParameters: [],
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
            name: "param",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {
            param: {
              name: "param",
              description: "",
              type: ArgumentType.STRING,
              defaultValue: undefined,
            },
          },
          positionalParameters: [],
        });
      });

      it("should add an option with a description", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addOption({
            name: "param",
            description: "Parameter description",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {
            param: {
              name: "param",
              description: "Parameter description",
              type: ArgumentType.STRING,
              defaultValue: undefined,
            },
          },
          positionalParameters: [],
        });
      });

      it("should add an option with a default value", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addOption({
            name: "param",
            defaultValue: "default",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {
            param: {
              name: "param",
              description: "",
              type: ArgumentType.STRING,
              defaultValue: "default",
            },
          },
          positionalParameters: [],
        });
      });

      it("should add an option with a type", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addOption({
            name: "param",
            type: ArgumentType.INT,
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {
            param: {
              name: "param",
              description: "",
              type: ArgumentType.INT,
              defaultValue: undefined,
            },
          },
          positionalParameters: [],
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
              description: "",
              type: ArgumentType.BOOLEAN,
              defaultValue: false,
            },
          },
          positionalParameters: [],
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
              description: "Flag description",
              type: ArgumentType.BOOLEAN,
              defaultValue: false,
            },
          },
          positionalParameters: [],
        });
      });
    });

    describe("Adding positional parameters", () => {
      it("should add a positional parameter", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addPositionalParameter({ name: "param" })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalParameters: [
            {
              name: "param",
              description: "",
              type: ArgumentType.STRING,
              defaultValue: undefined,
              isVariadic: false,
            },
          ],
        });
      });

      it("should add a positional parameter with a description", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addPositionalParameter({
            name: "param",
            description: "Param description",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalParameters: [
            {
              name: "param",
              description: "Param description",
              type: ArgumentType.STRING,
              defaultValue: undefined,
              isVariadic: false,
            },
          ],
        });
      });

      it("should add a positional parameter with a default value", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addPositionalParameter({
            name: "param",
            defaultValue: "default",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalParameters: [
            {
              name: "param",
              description: "",
              type: ArgumentType.STRING,
              defaultValue: "default",
              isVariadic: false,
            },
          ],
        });
      });

      it("should add a positional parameter with a type", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addPositionalParameter({
            name: "param",
            type: ArgumentType.INT,
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalParameters: [
            {
              name: "param",
              description: "",
              type: ArgumentType.INT,
              defaultValue: undefined,
              isVariadic: false,
            },
          ],
        });
      });
    });

    describe("Adding variadic parameters", () => {
      it("should add a variadic parameter", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addVariadicParameter({ name: "param" })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalParameters: [
            {
              name: "param",
              description: "",
              type: ArgumentType.STRING,
              defaultValue: undefined,
              isVariadic: true,
            },
          ],
        });
      });

      it("should add a variadic parameter with a description", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addVariadicParameter({
            name: "param",
            description: "Param description",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalParameters: [
            {
              name: "param",
              description: "Param description",
              type: ArgumentType.STRING,
              defaultValue: undefined,
              isVariadic: true,
            },
          ],
        });
      });

      it("should add a variadic parameter with a default value", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addVariadicParameter({
            name: "param",
            defaultValue: ["default1", "default2"],
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalParameters: [
            {
              name: "param",
              description: "",
              type: ArgumentType.STRING,
              defaultValue: ["default1", "default2"],
              isVariadic: true,
            },
          ],
        });
      });

      it("should add a variadic parameter with a type", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addVariadicParameter({ name: "param", type: ArgumentType.INT })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          options: {},
          positionalParameters: [
            {
              name: "param",
              description: "",
              type: ArgumentType.INT,
              defaultValue: undefined,
              isVariadic: true,
            },
          ],
        });
      });
    });

    describe("Parameter name validation", () => {
      const fnNames = [
        "addOption",
        "addFlag",
        "addPositionalParameter",
        "addVariadicParameter",
      ] as const;

      it("should throw if the parameter name is invalid", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        const invalidNames = ["invalid-name", "invalid_name", "123invalidName"];

        invalidNames.forEach((name) => {
          fnNames.forEach((fnName) => {
            assert.throws(
              () => builder[fnName]({ name }),
              new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
                name,
              }),
            );
          });
        });
      });

      it("should throw if the parameter name is already in use", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        builder
          .addOption({ name: "option" })
          .addFlag({ name: "flag" })
          .addPositionalParameter({ name: "posParam" })
          .addVariadicParameter({ name: "varParam" });

        const names = ["option", "flag", "posParam", "varParam"];

        names.forEach((name) => {
          fnNames.forEach((fnName) => {
            assert.throws(
              () => builder[fnName]({ name }),
              new HardhatError(HardhatError.ERRORS.ARGUMENTS.DUPLICATED_NAME, {
                name,
              }),
            );
          });
        });
      });

      it("should throw if the parameter name is reserved", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        RESERVED_PARAMETER_NAMES.forEach((name) => {
          assert.throws(
            () => builder.addOption({ name }),
            new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
              name,
            }),
          );
        });
      });
    });

    describe("Parameter type validation", () => {
      it("should throw if the default value does not match the type", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        const fnNames = ["addOption", "addPositionalParameter"] as const;

        fnNames.forEach((fnName) => {
          assert.throws(
            () =>
              builder[fnName]({
                name: "param",
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
                Intentionally testing an invalid type */
                defaultValue: 123 as any,
                type: ArgumentType.STRING,
              }),
            new HardhatError(
              HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
              {
                value: 123,
                name: "defaultValue",
                type: ArgumentType.STRING,
                task: "task-id",
              },
            ),
          );
        });

        assert.throws(
          () =>
            builder.addVariadicParameter({
              name: "param",
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
              Intentionally testing an invalid type */
              defaultValue: [123, 456, 789] as any,
              type: ArgumentType.STRING,
            }),
          new HardhatError(
            HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
            {
              value: [123, 456, 789],
              name: "defaultValue",
              type: ArgumentType.STRING,
              task: "task-id",
            },
          ),
        );
      });
    });

    describe("Positional parameter validation", () => {
      it("should throw if trying to add a required positional parameter after an optional one", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        builder.addPositionalParameter({
          name: "param",
          defaultValue: "default",
        });

        assert.throws(
          () => builder.addPositionalParameter({ name: "param2" }),
          new HardhatError(
            HardhatError.ERRORS.TASK_DEFINITIONS.REQUIRED_PARAM_AFTER_OPTIONAL,
            { name: "param2" },
          ),
        );
        assert.throws(
          () => builder.addVariadicParameter({ name: "param3" }),
          new HardhatError(
            HardhatError.ERRORS.TASK_DEFINITIONS.REQUIRED_PARAM_AFTER_OPTIONAL,
            { name: "param3" },
          ),
        );
      });

      it("should throw if trying to add a positional parameter after a variadic one", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        builder.addVariadicParameter({ name: "param" });

        assert.throws(
          () => builder.addPositionalParameter({ name: "param2" }),
          new HardhatError(
            HardhatError.ERRORS.TASK_DEFINITIONS.POSITIONAL_PARAM_AFTER_VARIADIC,
            { name: "param2" },
          ),
        );

        assert.throws(
          () => builder.addVariadicParameter({ name: "param3" }),
          new HardhatError(
            HardhatError.ERRORS.TASK_DEFINITIONS.POSITIONAL_PARAM_AFTER_VARIADIC,
            { name: "param3" },
          ),
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
        assert.throws(
          () => new TaskOverrideDefinitionBuilderImplementation(""),
          new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK_ID),
        );
      });

      it("should throw if the array of ids is empty", () => {
        const ids: string[] = [];

        assert.throws(
          () => new TaskOverrideDefinitionBuilderImplementation(ids),
          new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK_ID),
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
        assert.throws(
          () => builder.build(),
          new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.NO_ACTION, {
            task: "task-id",
          }),
        );
      });

      it("should throw if the task action is not a valid file URL", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        assert.throws(
          () => builder.setAction("not-a-valid-file-url"),
          new HardhatError(
            HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_FILE_ACTION,
            { action: "not-a-valid-file-url" },
          ),
        );
        assert.throws(
          () => builder.setAction("file://"),
          new HardhatError(
            HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_FILE_ACTION,
            { action: "file://" },
          ),
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
            name: "param",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          options: {
            param: {
              name: "param",
              description: "",
              type: ArgumentType.STRING,
              defaultValue: undefined,
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
            name: "param",
            description: "Parameter description",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          options: {
            param: {
              name: "param",
              description: "Parameter description",
              type: ArgumentType.STRING,
              defaultValue: undefined,
            },
          },
        });
      });

      it("should add an option with a default value", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addOption({
            name: "param",
            defaultValue: "default",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          options: {
            param: {
              name: "param",
              description: "",
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
            name: "param",
            type: ArgumentType.INT,
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          options: {
            param: {
              name: "param",
              description: "",
              type: ArgumentType.INT,
              defaultValue: undefined,
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
              description: "Flag description",
              type: ArgumentType.BOOLEAN,
              defaultValue: false,
            },
          },
        });
      });
    });

    describe("Parameter name validation", () => {
      const fnNames = ["addOption", "addFlag"] as const;

      it("should throw if the parameter name is invalid", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        const invalidNames = ["invalid-name", "invalid_name", "123invalidName"];

        invalidNames.forEach((name) => {
          fnNames.forEach((fnName) => {
            assert.throws(
              () => builder[fnName]({ name }),
              new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
                name,
              }),
            );
          });
        });
      });

      it("should throw if the parameter name is already in use", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        builder.addOption({ name: "option" }).addFlag({ name: "flag" });

        const names = ["option", "flag"];

        names.forEach((name) => {
          fnNames.forEach((fnName) => {
            assert.throws(
              () => builder[fnName]({ name }),
              new HardhatError(HardhatError.ERRORS.ARGUMENTS.DUPLICATED_NAME, {
                name,
              }),
            );
          });
        });
      });

      it("should throw if the parameter name is reserved", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        RESERVED_PARAMETER_NAMES.forEach((name) => {
          assert.throws(
            () => builder.addOption({ name }),
            new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
              name,
            }),
          );
        });
      });
    });

    describe("Parameter type validation", () => {
      it("should throw if the default value does not match the type", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        assert.throws(
          () =>
            builder.addOption({
              name: "param",
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
              Intentionally testing an invalid type */
              defaultValue: 123 as any,
              type: ArgumentType.STRING,
            }),
          new HardhatError(
            HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
            {
              value: 123,
              name: "defaultValue",
              type: ArgumentType.STRING,
              task: "task-id",
            },
          ),
        );
      });
    });
  });
});

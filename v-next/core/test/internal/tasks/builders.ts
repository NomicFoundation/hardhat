import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { RESERVED_PARAMETER_NAMES } from "../../../src/internal/parameters.js";
import {
  EmptyTaskDefinitionBuilderImplementation,
  NewTaskDefinitionBuilderImplementation,
  TaskOverrideDefinitionBuilderImplementation,
} from "../../../src/internal/tasks/builders.js";
import { ParameterType } from "../../../src/types/common.js";
import { TaskDefinitionType } from "../../../src/types/tasks.js";

describe("Task builders", () => {
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
        assert.throws(() => new EmptyTaskDefinitionBuilderImplementation(""), {
          name: "HardhatError",
          message:
            "HHE208: Task id cannot be an empty string or an empty array",
        });
      });

      it("should throw if the array of ids is empty", () => {
        const ids: string[] = [];

        assert.throws(() => new EmptyTaskDefinitionBuilderImplementation(ids), {
          name: "HardhatError",
          message:
            "HHE208: Task id cannot be an empty string or an empty array",
        });
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
        namedParameters: {},
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
        namedParameters: {},
        positionalParameters: [],
      });
    });

    describe("Task id validation", () => {
      it("should throw if the id is an empty string", () => {
        assert.throws(() => new NewTaskDefinitionBuilderImplementation(""), {
          name: "HardhatError",
          message:
            "HHE208: Task id cannot be an empty string or an empty array",
        });
      });

      it("should throw if the array of ids is empty", () => {
        const ids: string[] = [];

        assert.throws(() => new NewTaskDefinitionBuilderImplementation(ids), {
          name: "HardhatError",
          message:
            "HHE208: Task id cannot be an empty string or an empty array",
        });
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
          namedParameters: {},
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
          namedParameters: {},
          positionalParameters: [],
        });
      });

      it("should throw when trying to build a task definition without an action", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        assert.throws(() => builder.build(), {
          name: "HardhatError",
          message: `HHE202: The task task-id doesn't have an action`,
        });
      });

      it("should throw if the task action is not a valid file URL", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        assert.throws(() => builder.setAction("not-a-valid-file-url"), {
          name: "HardhatError",
          message:
            "HHE201: Invalid file action: not-a-valid-file-url is not a valid file URL",
        });
        assert.throws(() => builder.setAction("file://"), {
          name: "HardhatError",
          message:
            "HHE201: Invalid file action: file:// is not a valid file URL",
        });
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
          namedParameters: {},
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
          namedParameters: {},
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
          namedParameters: {},
          positionalParameters: [],
        });
      });
    });

    describe("Adding named parameters", () => {
      it("should add a named parameter", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addNamedParameter({
            name: "param",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          namedParameters: {
            param: {
              name: "param",
              description: "",
              parameterType: ParameterType.STRING,
              defaultValue: undefined,
            },
          },
          positionalParameters: [],
        });
      });

      it("should add a named parameter with a description", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addNamedParameter({
            name: "param",
            description: "Parameter description",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          namedParameters: {
            param: {
              name: "param",
              description: "Parameter description",
              parameterType: ParameterType.STRING,
              defaultValue: undefined,
            },
          },
          positionalParameters: [],
        });
      });

      it("should add a named parameter with a default value", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addNamedParameter({
            name: "param",
            defaultValue: "default",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          namedParameters: {
            param: {
              name: "param",
              description: "",
              parameterType: ParameterType.STRING,
              defaultValue: "default",
            },
          },
          positionalParameters: [],
        });
      });

      it("should add a named parameter with a type", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addNamedParameter({
            name: "param",
            type: ParameterType.INT,
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          namedParameters: {
            param: {
              name: "param",
              description: "",
              parameterType: ParameterType.INT,
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
          namedParameters: {
            flag: {
              name: "flag",
              description: "",
              parameterType: ParameterType.BOOLEAN,
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
          namedParameters: {
            flag: {
              name: "flag",
              description: "Flag description",
              parameterType: ParameterType.BOOLEAN,
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
          namedParameters: {},
          positionalParameters: [
            {
              name: "param",
              description: "",
              parameterType: ParameterType.STRING,
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
          namedParameters: {},
          positionalParameters: [
            {
              name: "param",
              description: "Param description",
              parameterType: ParameterType.STRING,
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
          namedParameters: {},
          positionalParameters: [
            {
              name: "param",
              description: "",
              parameterType: ParameterType.STRING,
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
            type: ParameterType.INT,
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          namedParameters: {},
          positionalParameters: [
            {
              name: "param",
              description: "",
              parameterType: ParameterType.INT,
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
          namedParameters: {},
          positionalParameters: [
            {
              name: "param",
              description: "",
              parameterType: ParameterType.STRING,
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
          namedParameters: {},
          positionalParameters: [
            {
              name: "param",
              description: "Param description",
              parameterType: ParameterType.STRING,
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
          namedParameters: {},
          positionalParameters: [
            {
              name: "param",
              description: "",
              parameterType: ParameterType.STRING,
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
          .addVariadicParameter({ name: "param", type: ParameterType.INT })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.NEW_TASK,
          id: ["task-id"],
          description: "",
          action: taskAction,
          namedParameters: {},
          positionalParameters: [
            {
              name: "param",
              description: "",
              parameterType: ParameterType.INT,
              defaultValue: undefined,
              isVariadic: true,
            },
          ],
        });
      });
    });

    describe("Parameter name validation", () => {
      const fnNames = [
        "addNamedParameter",
        "addFlag",
        "addPositionalParameter",
        "addVariadicParameter",
      ] as const;

      it("should throw if the parameter name is invalid", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        const invalidNames = ["invalid-name", "invalid_name", "123invalidName"];

        invalidNames.forEach((name) => {
          fnNames.forEach((fnName) => {
            assert.throws(() => builder[fnName]({ name }), {
              name: "HardhatError",
              message: `HHE303: Argument name ${name} is invalid`,
            });
          });
        });
      });

      it("should throw if the parameter name is already in use", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        builder
          .addNamedParameter({ name: "namedParam" })
          .addFlag({ name: "flag" })
          .addPositionalParameter({ name: "posParam" })
          .addVariadicParameter({ name: "varParam" });

        const names = ["namedParam", "flag", "posParam", "varParam"];

        names.forEach((name) => {
          fnNames.forEach((fnName) => {
            assert.throws(() => builder[fnName]({ name }), {
              name: "HardhatError",
              message: `HHE302: Argument name ${name} is already in use`,
            });
          });
        });
      });

      it("should throw if the parameter name is reserved", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        RESERVED_PARAMETER_NAMES.forEach((name) => {
          assert.throws(() => builder.addNamedParameter({ name }), {
            name: "HardhatError",
            message: `HHE301: Argument name ${name} is reserved`,
          });
        });
      });
    });

    describe("Parameter type validation", () => {
      it("should throw if the default value does not match the type", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        const fnNames = [
          "addNamedParameter",
          "addPositionalParameter",
        ] as const;

        fnNames.forEach((fnName) => {
          assert.throws(
            () =>
              builder[fnName]({
                name: "param",
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
                Intentionally testing an invalid type */
                defaultValue: 123 as any,
                type: ParameterType.STRING,
              }),
            new HardhatError(
              HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
              {
                value: 123,
                name: "defaultValue",
                type: ParameterType.STRING,
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
              type: ParameterType.STRING,
            }),
          new HardhatError(
            HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
            {
              value: [123, 456, 789],
              name: "defaultValue",
              type: ParameterType.STRING,
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
          {
            name: "HardhatError",
            message:
              "HHE204: Cannot add required positional param param2 after an optional one",
          },
        );
        assert.throws(() => builder.addVariadicParameter({ name: "param3" }), {
          name: "HardhatError",
          message:
            "HHE204: Cannot add required positional param param3 after an optional one",
        });
      });

      it("should throw if trying to add a positional parameter after a variadic one", () => {
        const builder = new NewTaskDefinitionBuilderImplementation("task-id");

        builder.addVariadicParameter({ name: "param" });

        assert.throws(
          () => builder.addPositionalParameter({ name: "param2" }),
          {
            name: "HardhatError",
            message:
              "HHE203: Cannot add the positional param param2 after a variadic one",
          },
        );

        assert.throws(() => builder.addVariadicParameter({ name: "param3" }), {
          name: "HardhatError",
          message:
            "HHE203: Cannot add the positional param param3 after a variadic one",
        });
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
        namedParameters: {},
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
        namedParameters: {},
      });
    });

    describe("Task id validation", () => {
      it("should throw if the id is an empty string", () => {
        assert.throws(
          () => new TaskOverrideDefinitionBuilderImplementation(""),
          {
            name: "HardhatError",
            message:
              "HHE208: Task id cannot be an empty string or an empty array",
          },
        );
      });

      it("should throw if the array of ids is empty", () => {
        const ids: string[] = [];

        assert.throws(
          () => new TaskOverrideDefinitionBuilderImplementation(ids),
          {
            name: "HardhatError",
            message:
              "HHE208: Task id cannot be an empty string or an empty array",
          },
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
          namedParameters: {},
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
          namedParameters: {},
        });
      });

      it("should throw when trying to build a task override definition without an action", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        assert.throws(() => builder.build(), {
          name: "HardhatError",
          message: `HHE202: The task task-id doesn't have an action`,
        });
      });

      it("should throw if the task action is not a valid file URL", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        assert.throws(() => builder.setAction("not-a-valid-file-url"), {
          name: "HardhatError",
          message:
            "HHE201: Invalid file action: not-a-valid-file-url is not a valid file URL",
        });
        assert.throws(() => builder.setAction("file://"), {
          name: "HardhatError",
          message:
            "HHE201: Invalid file action: file:// is not a valid file URL",
        });
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
          namedParameters: {},
        });
      });
    });

    describe("Adding named parameters", () => {
      it("should add a named parameter", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addNamedParameter({
            name: "param",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          namedParameters: {
            param: {
              name: "param",
              description: "",
              parameterType: ParameterType.STRING,
              defaultValue: undefined,
            },
          },
        });
      });

      it("should add a named parameter with a description", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addNamedParameter({
            name: "param",
            description: "Parameter description",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          namedParameters: {
            param: {
              name: "param",
              description: "Parameter description",
              parameterType: ParameterType.STRING,
              defaultValue: undefined,
            },
          },
        });
      });

      it("should add a named parameter with a default value", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addNamedParameter({
            name: "param",
            defaultValue: "default",
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          namedParameters: {
            param: {
              name: "param",
              description: "",
              parameterType: ParameterType.STRING,
              defaultValue: "default",
            },
          },
        });
      });

      it("should add a named parameter with a type", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );
        const taskAction = () => {};
        const taskDefinition = builder
          .setAction(taskAction)
          .addNamedParameter({
            name: "param",
            type: ParameterType.INT,
          })
          .build();

        assert.deepEqual(taskDefinition, {
          type: TaskDefinitionType.TASK_OVERRIDE,
          id: ["task-id"],
          description: undefined,
          action: taskAction,
          namedParameters: {
            param: {
              name: "param",
              description: "",
              parameterType: ParameterType.INT,
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
          namedParameters: {
            flag: {
              name: "flag",
              description: "",
              parameterType: ParameterType.BOOLEAN,
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
          namedParameters: {
            flag: {
              name: "flag",
              description: "Flag description",
              parameterType: ParameterType.BOOLEAN,
              defaultValue: false,
            },
          },
        });
      });
    });

    describe("Parameter name validation", () => {
      const fnNames = ["addNamedParameter", "addFlag"] as const;

      it("should throw if the parameter name is invalid", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        const invalidNames = ["invalid-name", "invalid_name", "123invalidName"];

        invalidNames.forEach((name) => {
          fnNames.forEach((fnName) => {
            assert.throws(() => builder[fnName]({ name }), {
              name: "HardhatError",
              message: `HHE303: Argument name ${name} is invalid`,
            });
          });
        });
      });

      it("should throw if the parameter name is already in use", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        builder
          .addNamedParameter({ name: "namedParam" })
          .addFlag({ name: "flag" });

        const names = ["namedParam", "flag"];

        names.forEach((name) => {
          fnNames.forEach((fnName) => {
            assert.throws(() => builder[fnName]({ name }), {
              name: "HardhatError",
              message: `HHE302: Argument name ${name} is already in use`,
            });
          });
        });
      });

      it("should throw if the parameter name is reserved", () => {
        const builder = new TaskOverrideDefinitionBuilderImplementation(
          "task-id",
        );

        RESERVED_PARAMETER_NAMES.forEach((name) => {
          assert.throws(() => builder.addNamedParameter({ name }), {
            name: "HardhatError",
            message: `HHE301: Argument name ${name} is reserved`,
          });
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
            builder.addNamedParameter({
              name: "param",
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
              Intentionally testing an invalid type */
              defaultValue: 123 as any,
              type: ParameterType.STRING,
            }),
          new HardhatError(
            HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
            {
              value: 123,
              name: "defaultValue",
              type: ParameterType.STRING,
              task: "task-id",
            },
          ),
        );
      });
    });
  });
});

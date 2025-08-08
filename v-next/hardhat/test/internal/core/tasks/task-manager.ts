import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertThrowsHardhatError,
  assertRejectsWithHardhatError,
} from "@nomicfoundation/hardhat-test-utils";

import { RESERVED_ARGUMENT_NAMES } from "../../../../src/internal/core/arguments.js";
import { globalOption } from "../../../../src/internal/core/config.js";
import { HardhatRuntimeEnvironmentImplementation } from "../../../../src/internal/core/hre.js";
import {
  EmptyTaskDefinitionBuilderImplementation,
  NewTaskDefinitionBuilderImplementation,
  TaskOverrideDefinitionBuilderImplementation,
} from "../../../../src/internal/core/tasks/builders.js";
import { ArgumentType } from "../../../../src/types/arguments.js";
import { TaskDefinitionType } from "../../../../src/types/tasks.js";

/**
 * There is a circular dependency between the TaskManagerImplementation and the
 * HardhatRuntimeEnvironmentImplementation. The TaskManagerImplementation needs
 * the HardhatRuntimeEnvironmentImplementation to be created, and the
 * HardhatRuntimeEnvironmentImplementation creates the TaskManagerImplementation.
 *
 * The way to test the TaskManagerImplementation is through the
 * HardhatRuntimeEnvironmentImplementation, as it's the one that creates the
 * TaskManagerImplementation.
 */
describe("TaskManagerImplementation", () => {
  it("should initialize the task manager with an empty set of tasks if no plugins or tasks are provided", async () => {
    const hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});

    assert.equal(hre.tasks.rootTasks.size, 0);
  });

  it("should initialize the task manager with the tasks from the plugins", async () => {
    const hre = await HardhatRuntimeEnvironmentImplementation.create(
      {
        plugins: [
          {
            id: "plugin1",
            tasks: [
              new NewTaskDefinitionBuilderImplementation("task1")
                .addOption({ name: "arg1", defaultValue: "default" })
                .setAction(() => {})
                .build(),
              new NewTaskDefinitionBuilderImplementation("task2")
                .addFlag({ name: "flag1" })
                .setAction(() => {})
                .build(),
            ],
            globalOptions: [
              globalOption({
                name: "globalOption1",
                description: "",
                type: ArgumentType.STRING_WITHOUT_DEFAULT,
                defaultValue: undefined,
              }),
            ],
          },
          {
            id: "plugin2",
            tasks: [
              new NewTaskDefinitionBuilderImplementation("task3")
                .addPositionalArgument({ name: "posArg1" })
                .addVariadicArgument({ name: "varArg1" })
                .setAction(() => {})
                .build(),
            ],
          },
        ],
      },
      {},
    );

    // task1 in plugin1 should be available
    const task1 = hre.tasks.getTask("task1");
    assert.deepEqual(task1.id, ["task1"]);
    assert.equal(task1.pluginId, "plugin1");

    // task2 in plugin1 should be available
    const task2 = hre.tasks.getTask("task2");
    assert.deepEqual(task2.id, ["task2"]);
    assert.equal(task2.pluginId, "plugin1");

    // task3 in plugin2 should be available
    const task3 = hre.tasks.getTask("task3");
    assert.deepEqual(task3.id, ["task3"]);
    assert.equal(task3.pluginId, "plugin2");

    // task1, task2 and task3 should be root tasks
    assert.equal(hre.tasks.rootTasks.size, 3);
    assert.deepEqual(hre.tasks.rootTasks.get("task1")?.id, ["task1"]);
    assert.deepEqual(hre.tasks.rootTasks.get("task2")?.id, ["task2"]);
    assert.deepEqual(hre.tasks.rootTasks.get("task3")?.id, ["task3"]);
  });

  it("should initialize the task manager with the tasks from the config", async () => {
    const hre = await HardhatRuntimeEnvironmentImplementation.create(
      {
        tasks: [
          new NewTaskDefinitionBuilderImplementation("task1")
            .addOption({ name: "arg1", defaultValue: "default" })
            .setAction(() => {})
            .build(),
          new NewTaskDefinitionBuilderImplementation("task2")
            .addFlag({ name: "flag1" })
            .setAction(() => {})
            .build(),
          new NewTaskDefinitionBuilderImplementation("task3")
            .addPositionalArgument({ name: "posArg1" })
            .addVariadicArgument({ name: "varArg1" })
            .setAction(() => {})
            .build(),
        ],
      },
      {},
    );

    // task1 in plugin1 should be available
    const task1 = hre.tasks.getTask("task1");
    assert.deepEqual(task1.id, ["task1"]);
    assert.equal(task1.pluginId, undefined);

    // task2 in plugin1 should be available
    const task2 = hre.tasks.getTask("task2");
    assert.deepEqual(task2.id, ["task2"]);
    assert.equal(task2.pluginId, undefined);

    // task3 in plugin2 should be available
    const task3 = hre.tasks.getTask("task3");
    assert.deepEqual(task3.id, ["task3"]);
    assert.equal(task3.pluginId, undefined);

    // task1, task2 and task3 should be root tasks
    assert.equal(hre.tasks.rootTasks.size, 3);
    assert.deepEqual(hre.tasks.rootTasks.get("task1")?.id, ["task1"]);
    assert.deepEqual(hre.tasks.rootTasks.get("task2")?.id, ["task2"]);
    assert.deepEqual(hre.tasks.rootTasks.get("task3")?.id, ["task3"]);
  });

  it("should override a task within the same plugin", async () => {
    const hre = await HardhatRuntimeEnvironmentImplementation.create(
      {
        plugins: [
          {
            id: "plugin1",
            tasks: [
              new NewTaskDefinitionBuilderImplementation("task1")
                .setDescription("description1")
                .addOption({ name: "arg1", defaultValue: "default" })
                .addFlag({ name: "flag1" })
                .addPositionalArgument({ name: "posArg1" })
                .addVariadicArgument({ name: "varArg1" })
                .setAction(() => {})
                .build(),
              // overriding task1 with a new description and arguments
              new TaskOverrideDefinitionBuilderImplementation("task1")
                .setDescription("description2")
                .addOption({ name: "arg2", defaultValue: "default" })
                .addFlag({ name: "flag2" })
                .setAction(() => {})
                .build(),
            ],
          },
        ],
      },
      {},
    );

    const task1 = hre.tasks.getTask("task1");
    assert.deepEqual(task1.id, ["task1"]);
    assert.equal(task1.pluginId, "plugin1");
    assert.equal(task1.description, "description2");
    // Original args should have not been removed
    assert.notEqual(task1.options.get("arg1"), undefined, "Should have arg1");
    assert.notEqual(task1.options.get("flag1"), undefined, "Should have flag1");
    assert.ok(
      task1.positionalArguments.some((p) => p.name === "posArg1"),
      "Should have posArg1",
    );
    assert.ok(
      task1.positionalArguments.some((p) => p.name === "posArg1"),
      "Should have varArg1",
    );
    // New args should be added by the overrides
    assert.notEqual(task1.options.get("arg2"), undefined, "Should have arg2");
    assert.notEqual(task1.options.get("flag2"), undefined, "Should have flag2");
    // Should have 2 actions
    assert.equal(task1.actions.length, 2);
    assert.equal(task1.actions[0].pluginId, "plugin1");
    assert.equal(task1.actions[1].pluginId, "plugin1");
  });

  it("should override a task from a different plugin", async () => {
    const hre = await HardhatRuntimeEnvironmentImplementation.create(
      {
        plugins: [
          {
            id: "plugin1",
            tasks: [
              new NewTaskDefinitionBuilderImplementation("task1")
                .setDescription("description1")
                .addOption({ name: "arg1", defaultValue: "default" })
                .addFlag({ name: "flag1" })
                .addPositionalArgument({ name: "posArg1" })
                .addVariadicArgument({ name: "varArg1" })
                .setAction(() => {})
                .build(),
            ],
          },
          {
            id: "plugin2",
            tasks: [
              // overriding task1 with a new description and arguments
              new TaskOverrideDefinitionBuilderImplementation("task1")
                .setDescription("description2")
                .addOption({ name: "arg2", defaultValue: "default" })
                .addFlag({ name: "flag2" })
                .setAction(() => {})
                .build(),
            ],
          },
        ],
      },
      {},
    );

    const task1 = hre.tasks.getTask("task1");
    assert.deepEqual(task1.id, ["task1"]);
    assert.equal(task1.pluginId, "plugin1");
    assert.equal(task1.description, "description2");
    // Original args should have not been removed
    assert.notEqual(task1.options.get("arg1"), undefined, "Should have arg1");
    assert.notEqual(task1.options.get("flag1"), undefined, "Should have flag1");
    assert.ok(
      task1.positionalArguments.some((p) => p.name === "posArg1"),
      "Should have posArg1",
    );
    assert.ok(
      task1.positionalArguments.some((p) => p.name === "posArg1"),
      "Should have varArg1",
    );
    // New args should be added by the overrides
    assert.notEqual(task1.options.get("arg2"), undefined, "Should have arg2");
    assert.notEqual(task1.options.get("flag2"), undefined, "Should have flag2");
    // Should have 2 actions
    assert.equal(task1.actions.length, 2);
    assert.equal(task1.actions[0].pluginId, "plugin1");
    assert.equal(task1.actions[1].pluginId, "plugin2");
  });

  it("should override the same task multiple times", async () => {
    const hre = await HardhatRuntimeEnvironmentImplementation.create(
      {
        plugins: [
          {
            id: "plugin1",
            tasks: [
              new NewTaskDefinitionBuilderImplementation("task1")
                .setDescription("description1")
                .addOption({ name: "arg1", defaultValue: "default" })
                .addFlag({ name: "flag1" })
                .addPositionalArgument({ name: "posArg1" })
                .addVariadicArgument({ name: "varArg1" })
                .setAction(() => {})
                .build(),
              // overriding task1 with a new description and arguments
              new TaskOverrideDefinitionBuilderImplementation("task1")
                .setDescription("description2")
                .addOption({ name: "arg2", defaultValue: "default" })
                .addFlag({ name: "flag2" })
                .setAction(() => {})
                .build(),
            ],
          },
          {
            id: "plugin2",
            tasks: [
              // overriding task1 with a new description and arguments
              new TaskOverrideDefinitionBuilderImplementation("task1")
                .setDescription("description3")
                .addOption({ name: "arg3", defaultValue: "default" })
                .addFlag({ name: "flag3" })
                .setAction(() => {})
                .build(),
            ],
          },
        ],
      },
      {},
    );

    const task1 = hre.tasks.getTask("task1");
    assert.deepEqual(task1.id, ["task1"]);
    assert.equal(task1.pluginId, "plugin1");
    assert.equal(task1.description, "description3");
    // Original args should have not been removed
    assert.notEqual(task1.options.get("arg1"), undefined, "Should have arg1");
    assert.notEqual(task1.options.get("flag1"), undefined, "Should have flag1");
    assert.ok(
      task1.positionalArguments.some((p) => p.name === "posArg1"),
      "Should have posArg1",
    );
    assert.ok(
      task1.positionalArguments.some((p) => p.name === "posArg1"),
      "Should have varArg1",
    );
    // New args should be added by the overrides
    assert.notEqual(task1.options.get("arg2"), undefined, "Should have arg2");
    assert.notEqual(task1.options.get("flag2"), undefined, "Should have flag2");
    assert.notEqual(task1.options.get("arg3"), undefined, "Should have arg3");
    assert.notEqual(task1.options.get("flag3"), undefined, "Should have flag3");
    // Should have 3 actions
    assert.equal(task1.actions.length, 3);
    assert.equal(task1.actions[0].pluginId, "plugin1");
    assert.equal(task1.actions[1].pluginId, "plugin1");
    assert.equal(task1.actions[2].pluginId, "plugin2");
  });

  it("should add an empty task", async () => {
    const hre = await HardhatRuntimeEnvironmentImplementation.create(
      {
        plugins: [
          {
            id: "plugin1",
            tasks: [
              new EmptyTaskDefinitionBuilderImplementation(
                "task1",
                "description1",
              ).build(),
            ],
          },
        ],
      },
      {},
    );

    const task1 = hre.tasks.getTask("task1");
    assert.deepEqual(task1.id, ["task1"]);
    assert.equal(task1.pluginId, "plugin1");
  });

  it("should add subtasks", async () => {
    const hre = await HardhatRuntimeEnvironmentImplementation.create(
      {
        plugins: [
          {
            id: "plugin1",
            tasks: [
              new EmptyTaskDefinitionBuilderImplementation(
                "task1",
                "description1",
              ).build(),
              // adds a subtask to the empty task
              new NewTaskDefinitionBuilderImplementation(["task1", "subtask1"])
                .setAction(() => {})
                .build(),
            ],
          },

          {
            id: "plugin2",
            tasks: [
              // adds a subtask to the non-empty task
              new NewTaskDefinitionBuilderImplementation([
                "task1",
                "subtask1",
                "subsubtask1",
              ])
                .setAction(() => {})
                .build(),
            ],
          },
        ],
      },
      {},
    );

    const task1 = hre.tasks.getTask("task1");
    assert.deepEqual(task1.id, ["task1"]);
    assert.equal(task1.pluginId, "plugin1");

    const subtask1 = hre.tasks.getTask(["task1", "subtask1"]);
    assert.deepEqual(subtask1.id, ["task1", "subtask1"]);
    assert.equal(subtask1.pluginId, "plugin1");

    const subsubtask1 = hre.tasks.getTask(["task1", "subtask1", "subsubtask1"]);
    assert.deepEqual(subsubtask1.id, ["task1", "subtask1", "subsubtask1"]);
    assert.equal(subsubtask1.pluginId, "plugin2");

    // task1 should be a root task, but subtask1 and subsubtask1 should not
    assert.equal(hre.tasks.rootTasks.size, 1);
    assert.deepEqual(hre.tasks.rootTasks.get("task1")?.id, ["task1"]);
    assert.equal(hre.tasks.rootTasks.get("subtask1"), undefined);
    assert.equal(hre.tasks.rootTasks.get("subsubtask1"), undefined);
  });

  /**
   * These are all tested with plugin tasks, but the same logic applies to config tasks
   */
  describe("errors", () => {
    it("should throw if there's a global option with the same name as a task option", async () => {
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addOption({ name: "arg1", defaultValue: "default" })
                    .setAction(() => {})
                    .build(),
                ],
              },
              {
                id: "plugin2",
                globalOptions: [
                  globalOption({
                    name: "arg1",
                    description: "",
                    type: ArgumentType.STRING_WITHOUT_DEFAULT,
                    defaultValue: undefined,
                  }),
                ],
              },
            ],
          },
          {},
        ),

        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_OPTION_ALREADY_DEFINED,
        {
          actorFragment: "Plugin plugin1 is",
          task: "task1",
          option: "arg1",
          globalOptionPluginId: "plugin2",
        },
      );
    });

    it("should throw if there's a global option with the same short name as a task option", async () => {
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addOption({
                      name: "arg1",
                      shortName: "a",
                      defaultValue: "default",
                    })
                    .setAction(() => {})
                    .build(),
                ],
              },
              {
                id: "plugin2",
                globalOptions: [
                  globalOption({
                    name: "arg1",
                    shortName: "a",
                    description: "",
                    type: ArgumentType.STRING_WITHOUT_DEFAULT,
                    defaultValue: undefined,
                  }),
                ],
              },
            ],
          },
          {},
        ),

        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_OPTION_ALREADY_DEFINED,
        {
          actorFragment: "Plugin plugin1 is",
          task: "task1",
          option: "arg1",
          globalOptionPluginId: "plugin2",
        },
      );
    });

    it("should throw if there's a global option with the same name as a task positional argument", async () => {
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addPositionalArgument({ name: "arg1" })
                    .setAction(() => {})
                    .build(),
                ],
              },
              {
                id: "plugin2",
                globalOptions: [
                  globalOption({
                    name: "arg1",
                    description: "",
                    type: ArgumentType.STRING_WITHOUT_DEFAULT,
                    defaultValue: undefined,
                  }),
                ],
              },
            ],
          },
          {},
        ),

        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_OPTION_ALREADY_DEFINED,
        {
          actorFragment: "Plugin plugin1 is",
          task: "task1",
          option: "arg1",
          globalOptionPluginId: "plugin2",
        },
      );
    });

    it("should throw if trying to add a task with an empty id", async () => {
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  // Manually creating a task as the builder doesn't allow empty ids
                  {
                    type: TaskDefinitionType.NEW_TASK,
                    id: [], // empty id
                    description: "",
                    action: () => {},
                    options: {},
                    positionalArguments: [],
                  },
                ],
              },
            ],
          },
          {},
        ),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.EMPTY_TASK_ID,
        {},
      );
    });

    it("should throw if trying to add a subtask for a task that doesn't exist", async () => {
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation([
                    "task1",
                    "subtask1",
                  ])
                    .addOption({ name: "arg1", defaultValue: "default" })
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        ),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.SUBTASK_WITHOUT_PARENT,
        {
          task: "task1",
          subtask: "task1 subtask1",
        },
      );
    });

    it("should throw if trying to add a task that already exists", async () => {
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addOption({ name: "arg1", defaultValue: "default" })
                    .setAction(() => {})
                    .build(),
                ],
              },
              {
                id: "plugin2",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addOption({ name: "arg2", defaultValue: "default" })
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        ),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_ALREADY_DEFINED,
        {
          actorFragment: "Plugin plugin2 is",
          task: "task1",
          definedByFragment: " by plugin plugin1",
        },
      );
    });

    it("should throw if trying to override a task that doesn't exist", async () => {
      // task1 will not be found as it's not defined
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new TaskOverrideDefinitionBuilderImplementation("task1")
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        ),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_NOT_FOUND,
        {
          task: "task1",
        },
      );
    });

    it("should throw if trying to override a task and there is a name clash with an existing option", async () => {
      // added argument clash with an existing option
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addOption({ name: "arg1", defaultValue: "default" })
                    .setAction(() => {})
                    .build(),
                ],
              },
              {
                id: "plugin2",
                tasks: [
                  new TaskOverrideDefinitionBuilderImplementation("task1")
                    .addOption({ name: "arg1", defaultValue: "default" })
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        ),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS
          .TASK_OVERRIDE_OPTION_ALREADY_DEFINED,
        {
          actorFragment: "Plugin plugin2 is",
          option: "arg1",
          task: "task1",
        },
      );

      // added flag clash with an existing option
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addOption({ name: "arg1", defaultValue: "default" })
                    .setAction(() => {})
                    .build(),
                ],
              },
              {
                id: "plugin2",
                tasks: [
                  new TaskOverrideDefinitionBuilderImplementation("task1")
                    .addFlag({ name: "arg1" })
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        ),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS
          .TASK_OVERRIDE_OPTION_ALREADY_DEFINED,
        {
          actorFragment: "Plugin plugin2 is",
          option: "arg1",
          task: "task1",
        },
      );
    });

    it("should throw if trying to override a task and there is a name clash with an existing flag argument", async () => {
      // added argument clash with an existing flag
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addFlag({ name: "flag1" })
                    .setAction(() => {})
                    .build(),
                ],
              },
              {
                id: "plugin2",
                tasks: [
                  new TaskOverrideDefinitionBuilderImplementation("task1")
                    .addOption({ name: "flag1", defaultValue: "default" })
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        ),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS
          .TASK_OVERRIDE_OPTION_ALREADY_DEFINED,
        {
          actorFragment: "Plugin plugin2 is",
          option: "flag1",
          task: "task1",
        },
      );

      // added flag clash with an existing flag
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addFlag({ name: "flag1" })
                    .setAction(() => {})
                    .build(),
                ],
              },
              {
                id: "plugin2",
                tasks: [
                  new TaskOverrideDefinitionBuilderImplementation("task1")
                    .addFlag({ name: "flag1" })
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        ),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS
          .TASK_OVERRIDE_OPTION_ALREADY_DEFINED,
        {
          actorFragment: "Plugin plugin2 is",
          option: "flag1",
          task: "task1",
        },
      );
    });

    it("should throw if trying to override a task and there is a name clash with an existing positional argument", async () => {
      // added argument clash with an existing positional argument
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addPositionalArgument({ name: "arg1" })
                    .setAction(() => {})
                    .build(),
                ],
              },
              {
                id: "plugin2",
                tasks: [
                  new TaskOverrideDefinitionBuilderImplementation("task1")
                    .addOption({ name: "arg1", defaultValue: "default" })
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        ),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS
          .TASK_OVERRIDE_OPTION_ALREADY_DEFINED,
        {
          actorFragment: "Plugin plugin2 is",
          option: "arg1",
          task: "task1",
        },
      );

      // added flag clash with an existing positional argument
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addPositionalArgument({ name: "flag1" })
                    .setAction(() => {})
                    .build(),
                ],
              },
              {
                id: "plugin2",
                tasks: [
                  new TaskOverrideDefinitionBuilderImplementation("task1")
                    .addFlag({ name: "flag1" })
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        ),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS
          .TASK_OVERRIDE_OPTION_ALREADY_DEFINED,
        {
          actorFragment: "Plugin plugin2 is",
          option: "flag1",
          task: "task1",
        },
      );
    });

    it("should throw if trying to override a task and there is a name clash with an existing variadic argument", async () => {
      // added argument clash with an existing variadic argument
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addVariadicArgument({ name: "arg1" })
                    .setAction(() => {})
                    .build(),
                ],
              },
              {
                id: "plugin2",
                tasks: [
                  new TaskOverrideDefinitionBuilderImplementation("task1")
                    .addOption({ name: "arg1", defaultValue: "default" })
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        ),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS
          .TASK_OVERRIDE_OPTION_ALREADY_DEFINED,
        {
          actorFragment: "Plugin plugin2 is",
          option: "arg1",
          task: "task1",
        },
      );

      // added flag clash with an existing variadic argument
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addVariadicArgument({ name: "flag1" })
                    .setAction(() => {})
                    .build(),
                ],
              },
              {
                id: "plugin2",
                tasks: [
                  new TaskOverrideDefinitionBuilderImplementation("task1")
                    .addFlag({ name: "flag1" })
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        ),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS
          .TASK_OVERRIDE_OPTION_ALREADY_DEFINED,
        {
          actorFragment: "Plugin plugin2 is",
          option: "flag1",
          task: "task1",
        },
      );
    });

    it("should throw if a plugins tries to override a task defined in the config", async () => {
      // this will fail as the config tasks are processed after
      // the plugin tasks so the override logic will not find task1
      await assertRejectsWithHardhatError(
        HardhatRuntimeEnvironmentImplementation.create(
          {
            tasks: [
              new NewTaskDefinitionBuilderImplementation("task1")
                .setAction(() => {})
                .build(),
            ],
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new TaskOverrideDefinitionBuilderImplementation("task1")
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        ),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_NOT_FOUND,
        {
          task: "task1",
        },
      );
    });

    describe("plain object validations", () => {
      it("should throw if the task definition object has an empty id", async () => {
        await assertRejectsWithHardhatError(
          HardhatRuntimeEnvironmentImplementation.create(
            {
              plugins: [
                {
                  id: "plugin1",
                  tasks: [
                    {
                      type: TaskDefinitionType.EMPTY_TASK,
                      id: [],
                      description: "",
                    },
                  ],
                },
              ],
            },
            {},
          ),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.EMPTY_TASK_ID,
          {},
        );

        await assertRejectsWithHardhatError(
          HardhatRuntimeEnvironmentImplementation.create(
            {
              plugins: [
                {
                  id: "plugin1",
                  tasks: [
                    {
                      type: TaskDefinitionType.NEW_TASK,
                      id: [],
                      description: "",
                      action: () => {},
                      options: {},
                      positionalArguments: [],
                    },
                  ],
                },
              ],
            },
            {},
          ),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.EMPTY_TASK_ID,
          {},
        );

        await assertRejectsWithHardhatError(
          HardhatRuntimeEnvironmentImplementation.create(
            {
              plugins: [
                {
                  id: "plugin1",
                  tasks: [
                    {
                      type: TaskDefinitionType.TASK_OVERRIDE,
                      id: [],
                      description: "",
                      action: () => {},
                      options: {},
                    },
                  ],
                },
              ],
            },
            {},
          ),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.EMPTY_TASK_ID,
          {},
        );
      });

      // it.only("should throw if the task definition object has an invalid action file URL", async () => {
      //   const invalidActionFileUrl = "not-a-valid-file-url";

      //   await HardhatRuntimeEnvironmentImplementation.create(
      //     {
      //       plugins: [
      //         {
      //           id: "plugin1",
      //           tasks: [
      //             {
      //               type: TaskDefinitionType.NEW_TASK,
      //               id: ["task-id"],
      //               description: "",
      //               action: invalidActionFileUrl,
      //               options: {},
      //               positionalArguments: [],
      //             },
      //           ],
      //         },
      //       ],
      //     },
      //     {},
      //   );

      //   // await HardhatRuntimeEnvironmentImplementation.create(
      //   //   {
      //   //     plugins: [
      //   //       {
      //   //         id: "plugin1",
      //   //         tasks: [
      //   //           {
      //   //             type: TaskDefinitionType.TASK_OVERRIDE,
      //   //             id: ["task-id"],
      //   //             description: "",
      //   //             action: invalidActionFileUrl,
      //   //             options: {},
      //   //           },
      //   //         ],
      //   //       },
      //   //     ],
      //   //   },
      //   //   {},
      //   // );
      // });

      it("should throw if the task definition object has an option with an invalid name", async () => {
        const invalidName = "invalid-name";
        await assertRejectsWithHardhatError(
          HardhatRuntimeEnvironmentImplementation.create(
            {
              plugins: [
                {
                  id: "plugin1",
                  tasks: [
                    {
                      type: TaskDefinitionType.NEW_TASK,
                      id: ["task-id"],
                      description: "",
                      action: () => {},
                      options: {
                        [invalidName]: {
                          name: invalidName,
                          description: "A description",
                          type: ArgumentType.STRING,
                          defaultValue: "default",
                        },
                      },
                      positionalArguments: [],
                    },
                  ],
                },
              ],
            },
            {},
          ),
          HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_NAME,
          {
            name: invalidName,
          },
        );

        await assertRejectsWithHardhatError(
          HardhatRuntimeEnvironmentImplementation.create(
            {
              plugins: [
                {
                  id: "plugin1",
                  tasks: [
                    {
                      type: TaskDefinitionType.TASK_OVERRIDE,
                      id: ["task-id"],
                      description: "",
                      action: () => {},
                      options: {
                        [invalidName]: {
                          name: invalidName,
                          description: "A description",
                          type: ArgumentType.STRING,
                          defaultValue: "default",
                        },
                      },
                    },
                  ],
                },
              ],
            },
            {},
          ),
          HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_NAME,
          {
            name: invalidName,
          },
        );
      });

      it("should throw if the task definition object has an option with an reserved name", async () => {
        RESERVED_ARGUMENT_NAMES.forEach(async (reservedName) => {
          await assertRejectsWithHardhatError(
            HardhatRuntimeEnvironmentImplementation.create(
              {
                plugins: [
                  {
                    id: "plugin1",
                    tasks: [
                      {
                        type: TaskDefinitionType.NEW_TASK,
                        id: ["task-id"],
                        description: "",
                        action: () => {},
                        options: {
                          [reservedName]: {
                            name: reservedName,
                            description: "A description",
                            type: ArgumentType.STRING,
                            defaultValue: "default",
                          },
                        },
                        positionalArguments: [],
                      },
                    ],
                  },
                ],
              },
              {},
            ),
            HardhatError.ERRORS.CORE.ARGUMENTS.RESERVED_NAME,
            {
              name: reservedName,
            },
          );

          await assertRejectsWithHardhatError(
            HardhatRuntimeEnvironmentImplementation.create(
              {
                plugins: [
                  {
                    id: "plugin1",
                    tasks: [
                      {
                        type: TaskDefinitionType.TASK_OVERRIDE,
                        id: ["task-id"],
                        description: "",
                        action: () => {},
                        options: {
                          [reservedName]: {
                            name: reservedName,
                            description: "A description",
                            type: ArgumentType.STRING,
                            defaultValue: "default",
                          },
                        },
                      },
                    ],
                  },
                ],
              },
              {},
            ),
            HardhatError.ERRORS.CORE.ARGUMENTS.RESERVED_NAME,
            {
              name: reservedName,
            },
          );
        });
      });

      it("should throw if the task definition object has arguments with an duplicated name", async () => {
        const duplicatedName = "duplicatedName";
        await assertRejectsWithHardhatError(
          HardhatRuntimeEnvironmentImplementation.create(
            {
              plugins: [
                {
                  id: "plugin1",
                  tasks: [
                    {
                      type: TaskDefinitionType.NEW_TASK,
                      id: ["task-id"],
                      description: "",
                      action: () => {},
                      options: {
                        [duplicatedName]: {
                          name: duplicatedName,
                          description: "A description",
                          type: ArgumentType.STRING,
                          defaultValue: "default",
                        },
                      },
                      positionalArguments: [
                        {
                          name: duplicatedName,
                          description: "A description",
                          type: ArgumentType.STRING,
                          isVariadic: false,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {},
          ),
          HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
          {
            name: duplicatedName,
          },
        );

        await assertRejectsWithHardhatError(
          HardhatRuntimeEnvironmentImplementation.create(
            {
              plugins: [
                {
                  id: "plugin1",
                  tasks: [
                    {
                      type: TaskDefinitionType.NEW_TASK,
                      id: ["task-id"],
                      description: "",
                      action: () => {},
                      options: {},
                      positionalArguments: [
                        {
                          name: duplicatedName,
                          description: "A description",
                          type: ArgumentType.STRING,
                          isVariadic: false,
                        },
                        {
                          name: duplicatedName,
                          description: "A description",
                          type: ArgumentType.STRING,
                          isVariadic: false,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {},
          ),
          HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
          {
            name: duplicatedName,
          },
        );
      });

      it("should throw if the task definition object has a positional argument with an invalid name", async () => {
        const invalidName = "invalid-name";
        await assertRejectsWithHardhatError(
          HardhatRuntimeEnvironmentImplementation.create(
            {
              plugins: [
                {
                  id: "plugin1",
                  tasks: [
                    {
                      type: TaskDefinitionType.NEW_TASK,
                      id: ["task-id"],
                      description: "",
                      action: () => {},
                      options: {},
                      positionalArguments: [
                        {
                          name: invalidName,
                          description: "A description",
                          type: ArgumentType.STRING,
                          isVariadic: false,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {},
          ),
          HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_NAME,
          {
            name: invalidName,
          },
        );
      });

      it("should throw if the task definition object has a positional argument with an reserved name", async () => {
        RESERVED_ARGUMENT_NAMES.forEach(async (reservedName) => {
          await assertRejectsWithHardhatError(
            HardhatRuntimeEnvironmentImplementation.create(
              {
                plugins: [
                  {
                    id: "plugin1",
                    tasks: [
                      {
                        type: TaskDefinitionType.NEW_TASK,
                        id: ["task-id"],
                        description: "",
                        action: () => {},
                        options: {},
                        positionalArguments: [
                          {
                            name: reservedName,
                            description: "A description",
                            type: ArgumentType.STRING,
                            isVariadic: false,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {},
            ),
            HardhatError.ERRORS.CORE.ARGUMENTS.RESERVED_NAME,
            {
              name: reservedName,
            },
          );
        });
      });

      it("should throw if the task definition object has a required positional argument after an optional argument", async () => {
        await assertRejectsWithHardhatError(
          HardhatRuntimeEnvironmentImplementation.create(
            {
              plugins: [
                {
                  id: "plugin1",
                  tasks: [
                    {
                      type: TaskDefinitionType.NEW_TASK,
                      id: ["task-id"],
                      description: "",
                      action: () => {},
                      options: {},
                      positionalArguments: [
                        {
                          name: "posArg",
                          description: "A description",
                          type: ArgumentType.STRING,
                          isVariadic: false,
                          defaultValue: "default",
                        },
                        {
                          name: "posArg2",
                          description: "A description",
                          type: ArgumentType.STRING,
                          isVariadic: false,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {},
          ),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.REQUIRED_ARG_AFTER_OPTIONAL,
          {
            name: "posArg2",
          },
        );
      });
    });
  });

  describe("getTask", () => {
    it("should return the task if it exists", async () => {
      const hre = await HardhatRuntimeEnvironmentImplementation.create(
        {
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .setAction(() => {})
                  .build(),
              ],
            },
          ],
          tasks: [
            new NewTaskDefinitionBuilderImplementation("task2")
              .setAction(() => {})
              .build(),
          ],
        },
        {},
      );

      const task1 = hre.tasks.getTask("task1");
      assert.deepEqual(task1.id, ["task1"]);
      assert.equal(task1.pluginId, "plugin1");

      const task2 = hre.tasks.getTask("task2");
      assert.deepEqual(task2.id, ["task2"]);
      assert.equal(task2.pluginId, undefined);
    });

    it("should throw if the task doesn't exist", async () => {
      const hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});
      // task1 will not be found as it's not defined
      assertThrowsHardhatError(
        () => hre.tasks.getTask("task1"),
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_NOT_FOUND,
        {
          task: "task1",
        },
      );
    });
  });

  /**
   * The run method is part of the Task interface, but it's tested through the
   * HardhatRuntimeEnvironmentImplementation for simplicity.
   */
  describe("run", () => {
    it("should run a task without arguments", async () => {
      let taskRun = false;
      const hre = await HardhatRuntimeEnvironmentImplementation.create(
        {
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .setAction(() => {
                    taskRun = true;
                  })
                  .build(),
              ],
            },
          ],
        },
        {},
      );

      const task1 = hre.tasks.getTask("task1");
      assert.equal(taskRun, false);
      await task1.run();
      assert.equal(taskRun, true);
    });

    it("should return the result of the task action", async () => {
      const hre = await HardhatRuntimeEnvironmentImplementation.create(
        {
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .setAction(() => "task run successfully")
                  .build(),
              ],
            },
          ],
        },
        {},
      );

      const task1 = hre.tasks.getTask("task1");
      const result = await task1.run();
      assert.equal(result, "task run successfully");
    });

    it("should run a overridden task without arguments", async () => {
      let taskRun = false;
      let overrideTaskRun = false;
      const hre = await HardhatRuntimeEnvironmentImplementation.create(
        {
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .setAction(() => {
                    taskRun = true;
                  })
                  .build(),
                new TaskOverrideDefinitionBuilderImplementation("task1")
                  .setAction(async (args, _hre, runSuper) => {
                    await runSuper(args);
                    overrideTaskRun = true;
                  })
                  .build(),
              ],
            },
          ],
        },
        {},
      );

      const task1 = hre.tasks.getTask("task1");
      assert.equal(taskRun, false);
      assert.equal(overrideTaskRun, false);
      await task1.run();
      assert.equal(taskRun, true);
      assert.equal(overrideTaskRun, true);
    });

    it("should run a task with several overrides", async () => {
      let taskRun = false;
      let override1TaskRun = false;
      let override2TaskRun = false;
      let override3TaskRun = false;
      const hre = await HardhatRuntimeEnvironmentImplementation.create(
        {
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .setAction(() => {
                    taskRun = true;
                  })
                  .build(),
                new TaskOverrideDefinitionBuilderImplementation("task1")
                  .setAction(async (args, _hre, runSuper) => {
                    await runSuper(args);
                    override1TaskRun = true;
                  })
                  .build(),
              ],
            },
            {
              id: "plugin2",
              tasks: [
                new TaskOverrideDefinitionBuilderImplementation("task1")
                  .setAction(async (args, _hre, runSuper) => {
                    await runSuper(args);
                    override2TaskRun = true;
                  })
                  .build(),
              ],
            },
          ],
          tasks: [
            new TaskOverrideDefinitionBuilderImplementation("task1")
              .setAction(async (args, _hre, runSuper) => {
                await runSuper(args);
                override3TaskRun = true;
              })
              .build(),
          ],
        },
        {},
      );

      const task1 = hre.tasks.getTask("task1");
      assert.equal(taskRun, false);
      assert.equal(override1TaskRun, false);
      assert.equal(override2TaskRun, false);
      assert.equal(override3TaskRun, false);
      await task1.run();
      assert.equal(taskRun, true);
      assert.equal(override1TaskRun, true);
      assert.equal(override2TaskRun, true);
      assert.equal(override3TaskRun, true);
    });

    it("should not run the original task action if the override task action doesn't call runSuper", async () => {
      let taskRun = false;
      let overrideTaskRun = false;
      const hre = await HardhatRuntimeEnvironmentImplementation.create(
        {
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .setAction(() => {
                    taskRun = true;
                  })
                  .build(),
                new TaskOverrideDefinitionBuilderImplementation("task1")
                  .setAction(async (_args, _hre, _runSuper) => {
                    overrideTaskRun = true;
                  })
                  .build(),
              ],
            },
          ],
        },
        {},
      );

      const task1 = hre.tasks.getTask("task1");
      assert.equal(taskRun, false);
      assert.equal(overrideTaskRun, false);
      await task1.run();
      assert.equal(taskRun, false);
      assert.equal(overrideTaskRun, true);
    });

    // it("should run a task with arguments", async () => {
    //   const hre = await HardhatRuntimeEnvironmentImplementation.create(
    //     {
    //       plugins: [
    //         {
    //           id: "plugin1",
    //           tasks: [
    //             new NewTaskDefinitionBuilderImplementation("task1")
    //               .addOption({ name: "arg1", defaultValue: "default" })
    //               .addOption({ name: "withDefault", defaultValue: "default" })
    //               .addFlag({ name: "flag1" })
    //               .addPositionalArgument({ name: "posArg" })
    //               .addVariadicArgument({ name: "varArg" })
    //               .setAction((args) => {
    //                 assert.deepEqual(args, {
    //                   arg1: "arg1Value",
    //                   flag1: true,
    //                   posArg: "posValue",
    //                   varArg: ["varValue1", "varValue2"],
    //                   withDefault: "default",
    //                 });
    //               })
    //               .build(),
    //             new TaskOverrideDefinitionBuilderImplementation("task1")
    //               .addOption({ name: "arg2", defaultValue: "default" })
    //               .addFlag({ name: "flag2" })
    //               .setAction(
    //                 async ({ arg2, flag2, ...args }, _hre, runSuper) => {
    //                   await runSuper(args);
    //                   assert.deepEqual(
    //                     { arg2, flag2 },
    //                     {
    //                       arg2: "arg2Value",
    //                       flag2: true,
    //                     },
    //                   );
    //                 },
    //               )
    //               .build(),
    //           ],
    //         },
    //       ],
    //     },
    //     {},
    //   );
    //   // withDefault option is intentionally omitted
    //   const providedArgs = {
    //     arg1: "arg1Value",
    //     flag1: true,
    //     posArg: "posValue",
    //     varArg: ["varValue1", "varValue2"],
    //     arg2: "arg2Value",
    //     flag2: true,
    //   };

    //   const task1 = hre.tasks.getTask("task1");
    //   await task1.run(providedArgs);
    //   // Ensure withDefault is not added to the args
    //   assert.deepEqual(
    //     providedArgs,
    //     {
    //       arg1: "arg1Value",
    //       flag1: true,
    //       posArg: "posValue",
    //       varArg: ["varValue1", "varValue2"],
    //       arg2: "arg2Value",
    //       flag2: true,
    //     },
    //     "Expected the providedArgs to not change",
    //   );
    // });

    it("should run a task with arguments and resolve their default values", async () => {
      const hre = await HardhatRuntimeEnvironmentImplementation.create(
        {
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .addOption({
                    name: "arg1",
                    defaultValue: "arg1DefaultValue",
                  })
                  .addFlag({ name: "flag1" })
                  .addPositionalArgument({
                    name: "posArg",
                    defaultValue: "posValue",
                  })
                  .addVariadicArgument({
                    name: "varArg",
                    defaultValue: ["varValue1", "varValue2"],
                  })
                  .setAction((args) => {
                    assert.deepEqual(args, {
                      arg1: "arg1DefaultValue",
                      flag1: false,
                      posArg: "posValue",
                      varArg: ["varValue1", "varValue2"],
                    });
                  })
                  .build(),
              ],
            },
          ],
        },
        {},
      );

      const task1 = hre.tasks.getTask("task1");
      await task1.run();
    });

    it("should run an empty task that was overridden", async () => {
      let overrideTaskRun = false;
      const hre = await HardhatRuntimeEnvironmentImplementation.create(
        {
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new EmptyTaskDefinitionBuilderImplementation(
                  "task1",
                  "description1",
                ).build(),
                new TaskOverrideDefinitionBuilderImplementation("task1")
                  .setAction(async (args, _hre, runSuper) => {
                    await runSuper(args);
                    overrideTaskRun = true;
                  })
                  .build(),
              ],
            },
          ],
        },
        {},
      );

      const task1 = hre.tasks.getTask("task1");
      assert.equal(overrideTaskRun, false);
      await task1.run();
      assert.equal(overrideTaskRun, true);
    });

    it("should run a task with an action url", async () => {
      const actionUrl = "./fixture-projects/file-actions/action-fn.js";

      const hre = await HardhatRuntimeEnvironmentImplementation.create(
        {
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .setAction((args) => args)
                  .build(),
                new TaskOverrideDefinitionBuilderImplementation("task1")
                  .addOption({ name: "arg1", defaultValue: "default" })
                  .setAction({
                    action: async () => import(actionUrl),
                  })
                  .build(),
              ],
            },
          ],
        },
        {},
      );

      const task1 = hre.tasks.getTask("task1");
      const response = await task1.run({ arg1: "arg1Value" });
      assert.deepEqual(response, { arg1: "arg1Value" });
    });

    it("should run a task with an invalid action url that was overridden and the override doesn't call runSuper", async () => {
      const validActionUrl = "./fixture-projects/file-actions/no-run-super.js";
      const invalidUrl = "file://not-a-module";

      const hre = await HardhatRuntimeEnvironmentImplementation.create(
        {
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .setAction({
                    action: async () => import(invalidUrl),
                  })
                  .build(),
                new TaskOverrideDefinitionBuilderImplementation("task1")
                  .addOption({ name: "arg1", defaultValue: "default" })
                  .setAction({
                    action: async () => import(validActionUrl),
                  })
                  .build(),
              ],
            },
          ],
        },
        {},
      );

      const task1 = hre.tasks.getTask("task1");
      const response = await task1.run({ arg1: "arg1Value" });
      assert.equal(
        response,
        `action fn called with args: ${JSON.stringify({ arg1: "arg1Value" })}`,
      );
    });

    describe("validations", () => {
      it("should throw if the task is empty", async () => {
        const hre = await HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new EmptyTaskDefinitionBuilderImplementation(
                    "task1",
                    "description1",
                  ).build(),
                ],
              },
            ],
          },
          {},
        );

        const task1 = hre.tasks.getTask("task1");
        await assertRejectsWithHardhatError(
          task1.run(),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.EMPTY_TASK,
          {
            task: "task1",
          },
        );
      });

      it("should throw if the provided argument is not one of the task arguments", async () => {
        const hre = await HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        );

        const task1 = hre.tasks.getTask("task1");
        await assertRejectsWithHardhatError(
          task1.run({ otherArg: "otherArgValue" }),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
          {
            option: "otherArg",
            task: "task1",
          },
        );
      });

      it("should throw if a required argument is missing", async () => {
        const hre = await HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addPositionalArgument({ name: "posArg" })
                    .addVariadicArgument({ name: "varArg" })
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        );

        const task1 = hre.tasks.getTask("task1");

        // posArg is missing
        await assertRejectsWithHardhatError(
          task1.run({
            option: "arg1Value",
            varArg: ["varValue1", "varValue2"],
          }),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS
            .MISSING_VALUE_FOR_TASK_ARGUMENT,
          {
            argument: "posArg",
            task: "task1",
          },
        );

        // varArg is missing
        await assertRejectsWithHardhatError(
          task1.run({
            option: "arg1Value",
            posArg: "posValue",
          }),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS
            .MISSING_VALUE_FOR_TASK_ARGUMENT,
          {
            argument: "varArg",
            task: "task1",
          },
        );
      });

      it("should throw if the provided value for the argument is not of the correct type", async () => {
        const hre = await HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .addOption({
                      name: "option",
                      type: ArgumentType.BIGINT,
                      defaultValue: 1n,
                    })
                    .addPositionalArgument({
                      name: "posArg",
                      type: ArgumentType.INT,
                    })
                    .addVariadicArgument({
                      name: "varArg",
                      type: ArgumentType.FILE,
                    })
                    .setAction(() => {})
                    .build(),
                ],
              },
            ],
          },
          {},
        );

        const task1 = hre.tasks.getTask("task1");

        // option has the wrong type
        await assertRejectsWithHardhatError(
          task1.run({
            option: "not a bigint",
            posArg: 10,
            varArg: ["file1", "file2", "file3"],
          }),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
          {
            value: "not a bigint",
            name: "option",
            type: ArgumentType.BIGINT,
            task: "task1",
          },
        );

        // posArg has the wrong type
        await assertRejectsWithHardhatError(
          task1.run({
            option: 5n,
            posArg: true,
            varArg: ["file1", "file2", "file3"],
          }),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
          {
            value: true,
            name: "posArg",
            type: ArgumentType.INT,
            task: "task1",
          },
        );

        // varArg has the wrong type (not an array)
        await assertRejectsWithHardhatError(
          task1.run({
            option: 5n,
            posArg: 10,
            varArg: "not an array",
          }),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
          {
            value: "not an array",
            name: "varArg",
            type: ArgumentType.FILE,
            task: "task1",
          },
        );

        // varArg has the wrong type (array element has the wrong type)
        await assertRejectsWithHardhatError(
          task1.run({
            option: 5n,
            posArg: 10,
            varArg: ["file1", 5, "file3"],
          }),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
          {
            value: ["file1", 5, "file3"],
            name: "varArg",
            type: ArgumentType.FILE,
            task: "task1",
          },
        );
      });

      it("should throw if a lazy import is provided but the corresponding module can't be resolved", async () => {
        const invalidUrl = "file://not-a-module";

        const hre = await HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .setAction({
                      action: async () => import(invalidUrl),
                    })
                    .build(),
                ],
                npmPackage: null,
              },
            ],
          },
          {},
        );

        const task1 = hre.tasks.getTask("task1");
        await assertRejectsWithHardhatError(
          task1.run(),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_ACTION_IMPORT,
          {
            task: "task1",
          },
        );
      });

      /**
       * There are multiple scenarios where detectPluginNpmDependencyProblems
       * can throw an error. We're not trying to test all of them, just verify
       * that the logic is being called and that the error is being thrown.
       */
      it("should throw if an action url is provided but the corresponding module can't be resolved due to a missing package", async () => {
        const nonInstalledPackageActionUrl =
          "./fixture-projects/not-installed-package/index.js";

        // the missing dependency is used in the NEW_TASK action
        let hre = await HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                npmPackage: "non-installed-package",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .setAction({
                      action: async () => import(nonInstalledPackageActionUrl),
                    })
                    .build(),
                ],
              },
            ],
          },
          {},
        );

        await assertRejectsWithHardhatError(
          hre.tasks.getTask("task1").run(),
          HardhatError.ERRORS.CORE.PLUGINS.PLUGIN_NOT_INSTALLED,
          {
            pluginId: "plugin1",
          },
        );

        // the missing dependency is used in the TASK_OVERRIDE action
        hre = await HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .setAction(() => {})
                    .build(),
                ],
              },
              {
                id: "plugin2",
                npmPackage: "non-installed-package",
                tasks: [
                  new TaskOverrideDefinitionBuilderImplementation("task1")
                    .setAction({
                      action: async () => import(nonInstalledPackageActionUrl),
                    })
                    .build(),
                ],
              },
            ],
          },
          {},
        );

        await assertRejectsWithHardhatError(
          hre.tasks.getTask("task1").run(),
          HardhatError.ERRORS.CORE.PLUGINS.PLUGIN_NOT_INSTALLED,
          {
            pluginId: "plugin2",
          },
        );
      });

      it("should throw if an action lazy import  is provided and the corresponding module doesn't have a default export", async () => {
        const actionUrl = "./fixture-projects/file-actions/no-default.js";

        const hre = await HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .setAction({
                      action: async () => import(actionUrl),
                    })
                    .build(),
                ],
              },
            ],
          },
          {},
        );

        const task1 = hre.tasks.getTask("task1");

        await assertRejectsWithHardhatError(
          task1.run(),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_ACTION,
          {
            task: "task1",
          },
        );
      });

      it("should throw if an action lazy import is provided and the corresponding module default export is not a function", async () => {
        const actionUrl = "./fixture-projects/file-actions/no-default-fn.js";

        const hre = await HardhatRuntimeEnvironmentImplementation.create(
          {
            plugins: [
              {
                id: "plugin1",
                tasks: [
                  new NewTaskDefinitionBuilderImplementation("task1")
                    .setAction({
                      action: async () => import(actionUrl),
                    })
                    .build(),
                ],
              },
            ],
          },
          {},
        );

        const task1 = hre.tasks.getTask("task1");

        await assertRejectsWithHardhatError(
          task1.run(),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_ACTION,
          {
            task: "task1",
          },
        );
      });
    });
  });
});

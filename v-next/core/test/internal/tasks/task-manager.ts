import type { HardhatUserConfig } from "../../../src/types/config.js";
import type { GlobalParameterMap } from "../../../src/types/global-parameters.js";
import type { HardhatPlugin } from "../../../src/types/plugins.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ParameterType } from "../../../src/config.js";
import { createHardhatRuntimeEnvironment } from "../../../src/index.js";
import { buildGlobalParameterDefinition } from "../../../src/internal/global-parameters.js";
import { resolvePluginList } from "../../../src/internal/plugins/resolve-plugin-list.js";
import {
  NewTaskDefinitionBuilderImplementation,
  TaskOverrideDefinitionBuilderImplementation,
} from "../../../src/internal/tasks/builders.js";
import { TaskDefinitionType } from "../../../src/types/tasks.js";

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
async function createHre({
  config = {},
  plugins = [],
}: {
  config?: HardhatUserConfig;
  plugins?: HardhatPlugin[];
  globalParameterMap?: GlobalParameterMap;
} = {}) {
  const resolvedPlugins = await resolvePluginList(plugins, process.cwd());

  return createHardhatRuntimeEnvironment(
    config,
    {},
    {
      resolvedPlugins,
    },
  );
}

describe("TaskManagerImplementation", () => {
  it("should initialize the task manager with an empty set of tasks if no plugins or tasks are provided", async () => {
    await assert.doesNotReject(createHre());
  });

  it("should initialize the task manager with the tasks from the plugins", async () => {
    const hre = await createHre({
      plugins: [
        {
          id: "plugin1",
          tasks: [
            new NewTaskDefinitionBuilderImplementation("task1")
              .addNamedParameter({ name: "param1" })
              .setAction(() => {})
              .build(),
            new NewTaskDefinitionBuilderImplementation("task2")
              .addFlag({ name: "flag1" })
              .setAction(() => {})
              .build(),
          ],
          globalParameters: [
            buildGlobalParameterDefinition({
              name: "globalParam1",
              description: "",
              parameterType: ParameterType.STRING,
              defaultValue: "",
            }),
          ],
        },
        {
          id: "plugin2",
          tasks: [
            new NewTaskDefinitionBuilderImplementation("task3")
              .addPositionalParameter({ name: "posParam1" })
              .addVariadicParameter({ name: "varParam1" })
              .setAction(() => {})
              .build(),
          ],
        },
      ],
    });

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
  });

  it("should initialize the task manager with the tasks from the config", async () => {
    const hre = await createHre({
      config: {
        tasks: [
          new NewTaskDefinitionBuilderImplementation("task1")
            .addNamedParameter({ name: "param1" })
            .setAction(() => {})
            .build(),
          new NewTaskDefinitionBuilderImplementation("task2")
            .addFlag({ name: "flag1" })
            .setAction(() => {})
            .build(),
          new NewTaskDefinitionBuilderImplementation("task3")
            .addPositionalParameter({ name: "posParam1" })
            .addVariadicParameter({ name: "varParam1" })
            .setAction(() => {})
            .build(),
        ],
      },
    });

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
  });

  it("should override a task within the same plugin", async () => {
    const hre = await createHre({
      plugins: [
        {
          id: "plugin1",
          tasks: [
            new NewTaskDefinitionBuilderImplementation("task1")
              .setDescription("description1")
              .addNamedParameter({ name: "param1" })
              .addFlag({ name: "flag1" })
              .addPositionalParameter({ name: "posParam1" })
              .addVariadicParameter({ name: "varParam1" })
              .setAction(() => {})
              .build(),
            // overriding task1 with a new description and parameters
            new TaskOverrideDefinitionBuilderImplementation("task1")
              .setDescription("description2")
              .addNamedParameter({ name: "param2" })
              .addFlag({ name: "flag2" })
              .setAction(() => {})
              .build(),
          ],
        },
      ],
    });

    const task1 = hre.tasks.getTask("task1");
    assert.deepEqual(task1.id, ["task1"]);
    assert.equal(task1.pluginId, "plugin1");
    assert.equal(task1.description, "description2");
    // Original params should have not been removed
    assert.ok(task1.namedParameters.get("param1"), "Should have param1");
    assert.ok(task1.namedParameters.get("flag1"), "Should have flag1");
    assert.ok(
      task1.positionalParameters.some((p) => p.name === "posParam1"),
      "Should have posParam1",
    );
    assert.ok(
      task1.positionalParameters.some((p) => p.name === "posParam1"),
      "Should have varParam1",
    );
    // New params should be added by the overrides
    assert.ok(task1.namedParameters.get("param2"), "Should have param2");
    assert.ok(task1.namedParameters.get("flag2"), "Should have flag2");
    // Should have 2 actions
    assert.equal(task1.actions.length, 2);
    assert.equal(task1.actions[0].pluginId, "plugin1");
    assert.equal(task1.actions[1].pluginId, "plugin1");
  });

  it("should override a task from a different plugin", async () => {
    const hre = await createHre({
      plugins: [
        {
          id: "plugin1",
          tasks: [
            new NewTaskDefinitionBuilderImplementation("task1")
              .setDescription("description1")
              .addNamedParameter({ name: "param1" })
              .addFlag({ name: "flag1" })
              .addPositionalParameter({ name: "posParam1" })
              .addVariadicParameter({ name: "varParam1" })
              .setAction(() => {})
              .build(),
          ],
        },
        {
          id: "plugin2",
          tasks: [
            // overriding task1 with a new description and parameters
            new TaskOverrideDefinitionBuilderImplementation("task1")
              .setDescription("description2")
              .addNamedParameter({ name: "param2" })
              .addFlag({ name: "flag2" })
              .setAction(() => {})
              .build(),
          ],
        },
      ],
    });

    const task1 = hre.tasks.getTask("task1");
    assert.deepEqual(task1.id, ["task1"]);
    assert.equal(task1.pluginId, "plugin1");
    assert.equal(task1.description, "description2");
    // Original params should have not been removed
    assert.ok(task1.namedParameters.get("param1"), "Should have param1");
    assert.ok(task1.namedParameters.get("flag1"), "Should have flag1");
    assert.ok(
      task1.positionalParameters.some((p) => p.name === "posParam1"),
      "Should have posParam1",
    );
    assert.ok(
      task1.positionalParameters.some((p) => p.name === "posParam1"),
      "Should have varParam1",
    );
    // New params should be added by the overrides
    assert.ok(task1.namedParameters.get("param2"), "Should have param2");
    assert.ok(task1.namedParameters.get("flag2"), "Should have flag2");
    // Should have 2 actions
    assert.equal(task1.actions.length, 2);
    assert.equal(task1.actions[0].pluginId, "plugin1");
    assert.equal(task1.actions[1].pluginId, "plugin2");
  });

  it("should override the same task multiple times", async () => {
    const hre = await createHre({
      plugins: [
        {
          id: "plugin1",
          tasks: [
            new NewTaskDefinitionBuilderImplementation("task1")
              .setDescription("description1")
              .addNamedParameter({ name: "param1" })
              .addFlag({ name: "flag1" })
              .addPositionalParameter({ name: "posParam1" })
              .addVariadicParameter({ name: "varParam1" })
              .setAction(() => {})
              .build(),
            // overriding task1 with a new description and parameters
            new TaskOverrideDefinitionBuilderImplementation("task1")
              .setDescription("description2")
              .addNamedParameter({ name: "param2" })
              .addFlag({ name: "flag2" })
              .setAction(() => {})
              .build(),
          ],
        },
        {
          id: "plugin2",
          tasks: [
            // overriding task1 with a new description and parameters
            new TaskOverrideDefinitionBuilderImplementation("task1")
              .setDescription("description3")
              .addNamedParameter({ name: "param3" })
              .addFlag({ name: "flag3" })
              .setAction(() => {})
              .build(),
          ],
        },
      ],
    });

    const task1 = hre.tasks.getTask("task1");
    assert.deepEqual(task1.id, ["task1"]);
    assert.equal(task1.pluginId, "plugin1");
    assert.equal(task1.description, "description3");
    // Original params should have not been removed
    assert.ok(task1.namedParameters.get("param1"), "Should have param1");
    assert.ok(task1.namedParameters.get("flag1"), "Should have flag1");
    assert.ok(
      task1.positionalParameters.some((p) => p.name === "posParam1"),
      "Should have posParam1",
    );
    assert.ok(
      task1.positionalParameters.some((p) => p.name === "posParam1"),
      "Should have varParam1",
    );
    // New params should be added by the overrides
    assert.ok(task1.namedParameters.get("param2"), "Should have param2");
    assert.ok(task1.namedParameters.get("flag2"), "Should have flag2");
    assert.ok(task1.namedParameters.get("param3"), "Should have param3");
    assert.ok(task1.namedParameters.get("flag3"), "Should have flag3");
    // Should have 3 actions
    assert.equal(task1.actions.length, 3);
    assert.equal(task1.actions[0].pluginId, "plugin1");
    assert.equal(task1.actions[1].pluginId, "plugin1");
    assert.equal(task1.actions[2].pluginId, "plugin2");
  });

  it("should add an empty task", async () => {
    const hre = await createHre({
      plugins: [
        {
          id: "plugin1",
          tasks: [
            {
              id: ["task1"],
              description: "description1",
              type: TaskDefinitionType.EMPTY_TASK,
            },
          ],
        },
      ],
    });

    const task1 = hre.tasks.getTask("task1");
    assert.deepEqual(task1.id, ["task1"]);
    assert.equal(task1.pluginId, "plugin1");
  });

  it("should add subtasks", async () => {
    const hre = await createHre({
      plugins: [
        {
          id: "plugin1",
          tasks: [
            {
              id: ["task1"],
              description: "description1",
              type: TaskDefinitionType.EMPTY_TASK,
            },
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
    });

    const task1 = hre.tasks.getTask("task1");
    assert.deepEqual(task1.id, ["task1"]);
    assert.equal(task1.pluginId, "plugin1");

    const subtask1 = hre.tasks.getTask(["task1", "subtask1"]);
    assert.deepEqual(subtask1.id, ["task1", "subtask1"]);
    assert.equal(subtask1.pluginId, "plugin1");

    const subsubtask1 = hre.tasks.getTask(["task1", "subtask1", "subsubtask1"]);
    assert.deepEqual(subsubtask1.id, ["task1", "subtask1", "subsubtask1"]);
    assert.equal(subsubtask1.pluginId, "plugin2");
  });

  /**
   * These are all tested with plugin tasks, but the same logic applies to config tasks
   */
  describe("errors", () => {
    it("should throw if there's a global parameter with the same name as a task named parameter", async () => {
      await assert.rejects(
        createHre({
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .addNamedParameter({ name: "param1" })
                  .setAction(() => {})
                  .build(),
              ],
            },
            {
              id: "plugin2",
              globalParameters: [
                buildGlobalParameterDefinition({
                  name: "param1",
                  description: "",
                  parameterType: ParameterType.STRING,
                  defaultValue: "",
                }),
              ],
            },
          ],
        }),
        new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.TASK_PARAMETER_ALREADY_DEFINED,
          {
            actorFragment: "Plugin plugin1 is",
            task: "task1",
            namedParamName: "param1",
            globalParamPluginId: "plugin2",
          },
        ),
      );
    });

    it("should throw if trying to add a task with an empty id", async () => {
      await assert.rejects(
        createHre({
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
                  namedParameters: {},
                  positionalParameters: [],
                },
              ],
            },
          ],
        }),
        new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK_ID),
      );
    });

    it("should throw if trying to add a subtask for a task that doesn't exist", async () => {
      await assert.rejects(
        createHre({
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation([
                  "task1",
                  "subtask1",
                ])
                  .addNamedParameter({ name: "param1" })
                  .setAction(() => {})
                  .build(),
              ],
            },
          ],
        }),
        new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.SUBTASK_WITHOUT_PARENT,
          {
            task: "task1",
            subtask: "task1 subtask1",
          },
        ),
      );
    });

    it("should throw if trying to add a task that already exists", async () => {
      await assert.rejects(
        createHre({
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .addNamedParameter({ name: "param1" })
                  .setAction(() => {})
                  .build(),
              ],
            },
            {
              id: "plugin2",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .addNamedParameter({ name: "param2" })
                  .setAction(() => {})
                  .build(),
              ],
            },
          ],
        }),
        new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.TASK_ALREADY_DEFINED,
          {
            actorFragment: "Plugin plugin2 is",
            task: "task1",
            definedByFragment: " by plugin plugin1",
          },
        ),
      );
    });

    it("should throw if trying to override a task that doesn't exist", async () => {
      // Empty id task will not be found as empty ids are not allowed
      await assert.rejects(
        createHre({
          plugins: [
            {
              id: "plugin1",
              tasks: [
                // Manually creating a task as the builder doesn't allow empty ids
                {
                  type: TaskDefinitionType.TASK_OVERRIDE,
                  id: [], // empty id
                  description: "",
                  action: () => {},
                  namedParameters: {},
                },
              ],
            },
          ],
        }),
        new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.TASK_NOT_FOUND, {
          task: "",
        }),
      );

      // task1 will not be found as it's not defined
      await assert.rejects(
        createHre({
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
        }),
        new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.TASK_NOT_FOUND, {
          task: "task1",
        }),
      );
    });

    it("should throw if trying to override a task and there is a name clash with an exising named parameter", async () => {
      // added parameter clash with an existing named parameter
      await assert.rejects(
        createHre({
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .addNamedParameter({ name: "param1" })
                  .setAction(() => {})
                  .build(),
              ],
            },
            {
              id: "plugin2",
              tasks: [
                new TaskOverrideDefinitionBuilderImplementation("task1")
                  .addNamedParameter({ name: "param1" })
                  .setAction(() => {})
                  .build(),
              ],
            },
          ],
        }),
        new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.TASK_OVERRIDE_PARAMETER_ALREADY_DEFINED,
          {
            actorFragment: "Plugin plugin2 is",
            namedParamName: "param1",
            task: "task1",
          },
        ),
      );

      // added flag clash with an existing named parameter
      await assert.rejects(
        createHre({
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .addNamedParameter({ name: "param1" })
                  .setAction(() => {})
                  .build(),
              ],
            },
            {
              id: "plugin2",
              tasks: [
                new TaskOverrideDefinitionBuilderImplementation("task1")
                  .addFlag({ name: "param1" })
                  .setAction(() => {})
                  .build(),
              ],
            },
          ],
        }),
        new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.TASK_OVERRIDE_PARAMETER_ALREADY_DEFINED,
          {
            actorFragment: "Plugin plugin2 is",
            namedParamName: "param1",
            task: "task1",
          },
        ),
      );
    });

    it("should throw if trying to override a task and there is a name clash with an exising flag parameter", async () => {
      // added parameter clash with an existing flag
      await assert.rejects(
        createHre({
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
                  .addNamedParameter({ name: "flag1" })
                  .setAction(() => {})
                  .build(),
              ],
            },
          ],
        }),
        new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.TASK_OVERRIDE_PARAMETER_ALREADY_DEFINED,
          {
            actorFragment: "Plugin plugin2 is",
            namedParamName: "flag1",
            task: "task1",
          },
        ),
      );

      // added flag clash with an existing flag
      await assert.rejects(
        createHre({
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
        }),
        new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.TASK_OVERRIDE_PARAMETER_ALREADY_DEFINED,
          {
            actorFragment: "Plugin plugin2 is",
            namedParamName: "flag1",
            task: "task1",
          },
        ),
      );
    });

    it("should throw if trying to override a task and there is a name clash with an exising positional parameter", async () => {
      // added parameter clash with an existing positional parameter
      await assert.rejects(
        createHre({
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .addPositionalParameter({ name: "param1" })
                  .setAction(() => {})
                  .build(),
              ],
            },
            {
              id: "plugin2",
              tasks: [
                new TaskOverrideDefinitionBuilderImplementation("task1")
                  .addNamedParameter({ name: "param1" })
                  .setAction(() => {})
                  .build(),
              ],
            },
          ],
        }),
        new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.TASK_OVERRIDE_PARAMETER_ALREADY_DEFINED,
          {
            actorFragment: "Plugin plugin2 is",
            namedParamName: "param1",
            task: "task1",
          },
        ),
      );

      // added flag clash with an existing positional parameter
      await assert.rejects(
        createHre({
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .addPositionalParameter({ name: "flag1" })
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
        }),
        new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.TASK_OVERRIDE_PARAMETER_ALREADY_DEFINED,
          {
            actorFragment: "Plugin plugin2 is",
            namedParamName: "flag1",
            task: "task1",
          },
        ),
      );
    });

    it("should throw if trying to override a task and there is a name clash with an exising variadic parameter", async () => {
      // added parameter clash with an existing variadic parameter
      await assert.rejects(
        createHre({
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .addVariadicParameter({ name: "param1" })
                  .setAction(() => {})
                  .build(),
              ],
            },
            {
              id: "plugin2",
              tasks: [
                new TaskOverrideDefinitionBuilderImplementation("task1")
                  .addNamedParameter({ name: "param1" })
                  .setAction(() => {})
                  .build(),
              ],
            },
          ],
        }),
        new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.TASK_OVERRIDE_PARAMETER_ALREADY_DEFINED,
          {
            actorFragment: "Plugin plugin2 is",
            namedParamName: "param1",
            task: "task1",
          },
        ),
      );

      // added flag clash with an existing variadic parameter
      await assert.rejects(
        createHre({
          plugins: [
            {
              id: "plugin1",
              tasks: [
                new NewTaskDefinitionBuilderImplementation("task1")
                  .addVariadicParameter({ name: "flag1" })
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
        }),
        new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.TASK_OVERRIDE_PARAMETER_ALREADY_DEFINED,
          {
            actorFragment: "Plugin plugin2 is",
            namedParamName: "flag1",
            task: "task1",
          },
        ),
      );
    });

    it("should throw if a plugins tries to override a task defined in the config", async () => {
      // this will fail as the config tasks are processed after
      // the plugin tasks so the override logic will not find task1
      await assert.rejects(
        createHre({
          config: {
            tasks: [
              new NewTaskDefinitionBuilderImplementation("task1")
                .setAction(() => {})
                .build(),
            ],
          },
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
        }),
        new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.TASK_NOT_FOUND, {
          task: "task1",
        }),
      );
    });
  });

  describe("getTask", () => {
    it("should return the task if it exists", async () => {
      const hre = await createHre({
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
        config: {
          tasks: [
            new NewTaskDefinitionBuilderImplementation("task2")
              .setAction(() => {})
              .build(),
          ],
        },
      });

      const task1 = hre.tasks.getTask("task1");
      assert.deepEqual(task1.id, ["task1"]);
      assert.equal(task1.pluginId, "plugin1");

      const task2 = hre.tasks.getTask("task2");
      assert.deepEqual(task2.id, ["task2"]);
      assert.equal(task2.pluginId, undefined);
    });

    it("should throw if the task doesn't exist", async () => {
      const hre = await createHre();
      // task1 will not be found as it's not defined
      assert.throws(
        () => hre.tasks.getTask("task1"),
        new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.TASK_NOT_FOUND, {
          task: "task1",
        }),
      );
    });
  });
});

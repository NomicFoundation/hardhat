import type { PositionalArgumentDefinition } from "../../../types/arguments.js";
import type { GlobalOptionDefinitions } from "../../../types/global-options.js";
import type { HardhatRuntimeEnvironment } from "../../../types/hre.js";
import type {
  Task,
  TaskDefinition,
  TaskManager,
  NewTaskDefinition,
  TaskOverrideDefinition,
} from "../../../types/tasks.js";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";

import { TaskDefinitionType } from "../../../types/tasks.js";

import { ResolvedTask } from "./resolved-task.js";
import { formatTaskId, getActorFragment } from "./utils.js";
import {
  validateAction,
  validateId,
  validateOption,
  validatePositionalArgument,
} from "./validations.js";

export class TaskManagerImplementation implements TaskManager {
  readonly #hre: HardhatRuntimeEnvironment;
  readonly #rootTasks = new Map<string, Task>();

  constructor(
    hre: HardhatRuntimeEnvironment,
    globalOptionDefinitions: GlobalOptionDefinitions,
  ) {
    this.#hre = hre;

    // reduce plugin tasks
    for (const plugin of this.#hre.config.plugins) {
      if (plugin.tasks === undefined) {
        continue;
      }

      for (const taskDefinition of plugin.tasks) {
        this.#validateTaskDefinition(taskDefinition);
        this.#reduceTaskDefinition(
          globalOptionDefinitions,
          taskDefinition,
          plugin.id,
        );
      }
    }

    // reduce global user defined tasks
    for (const taskDefinition of this.#hre.config.tasks) {
      this.#validateTaskDefinition(taskDefinition);
      this.#reduceTaskDefinition(globalOptionDefinitions, taskDefinition);
    }
  }

  public get rootTasks(): Map<string, Task> {
    return this.#rootTasks;
  }

  public getTask(taskId: string | string[]): Task {
    taskId = Array.isArray(taskId) ? taskId : [taskId];
    if (taskId.length === 0) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_NOT_FOUND,
        {
          task: formatTaskId(taskId),
        },
      );
    }

    let tasks = this.#rootTasks;
    let task: Task | undefined;
    for (let i = 0; i < taskId.length; i++) {
      const idFragment = taskId[i];
      const currentTask = tasks.get(idFragment);
      if (currentTask === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_NOT_FOUND,
          {
            task: formatTaskId(taskId.slice(0, i + 1)),
          },
        );
      }

      task = currentTask;
      tasks = task.subtasks;
    }

    assertHardhatInvariant(
      task !== undefined,
      "Task is undefined despite it being always set by a non-empty loop",
    );

    return task;
  }

  #insertTask(taskId: string[], task: Task, pluginId?: string) {
    if (taskId.length === 0) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.EMPTY_TASK_ID,
      );
    }

    // Traverse all the parent tasks to check that they exist
    let tasks = this.#rootTasks;
    for (let i = 0; i < taskId.length - 1; i++) {
      const idFragment = taskId[i];
      const currentTask = tasks.get(idFragment);
      if (currentTask === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.SUBTASK_WITHOUT_PARENT,
          {
            task: formatTaskId(taskId.slice(0, i + 1)),
            subtask: formatTaskId(taskId),
          },
        );
      }

      tasks = currentTask.subtasks;
    }

    // Check that the task doesn't already exist
    const lastIdFragment = taskId[taskId.length - 1];
    const existingTask = tasks.get(lastIdFragment);
    if (existingTask !== undefined) {
      const exPluginId = existingTask.pluginId;
      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_ALREADY_DEFINED,
        {
          actorFragment: getActorFragment(pluginId),
          task: formatTaskId(taskId),
          definedByFragment:
            exPluginId !== undefined ? ` by plugin ${exPluginId}` : "",
        },
      );
    }

    // Insert the task
    tasks.set(lastIdFragment, task);
  }

  #reduceTaskDefinition(
    globalOptionDefinitions: GlobalOptionDefinitions,
    taskDefinition: TaskDefinition,
    pluginId?: string,
  ) {
    switch (taskDefinition.type) {
      case TaskDefinitionType.EMPTY_TASK: {
        const task = ResolvedTask.createEmptyTask(
          this.#hre,
          taskDefinition.id,
          taskDefinition.description,
          pluginId,
        );

        this.#insertTask(taskDefinition.id, task, pluginId);
        break;
      }
      case TaskDefinitionType.NEW_TASK: {
        this.#validateClashesWithGlobalOptions(
          globalOptionDefinitions,
          taskDefinition,
          pluginId,
        );

        const task = ResolvedTask.createNewTask(
          this.#hre,
          taskDefinition.id,
          taskDefinition.description,
          taskDefinition.action,
          taskDefinition.options,
          taskDefinition.positionalArguments,
          pluginId,
        );

        this.#insertTask(taskDefinition.id, task, pluginId);
        break;
      }
      case TaskDefinitionType.TASK_OVERRIDE: {
        this.#validateClashesWithGlobalOptions(
          globalOptionDefinitions,
          taskDefinition,
          pluginId,
        );

        this.#processTaskOverride(taskDefinition, pluginId);
        break;
      }
    }
  }

  #validateClashesWithGlobalOptions(
    globalOptionDefinitions: GlobalOptionDefinitions,
    taskDefinition: NewTaskDefinition | TaskOverrideDefinition,
    pluginId?: string,
  ) {
    const optionNames = Object.keys(taskDefinition.options);
    const positionalArgNames =
      "positionalArguments" in taskDefinition
        ? taskDefinition.positionalArguments.map(({ name }) => name)
        : [];

    [...optionNames, ...positionalArgNames].forEach((argName) => {
      const globalOptionEntry = globalOptionDefinitions.get(argName);
      if (globalOptionEntry !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_OPTION_ALREADY_DEFINED,
          {
            actorFragment: getActorFragment(pluginId),
            task: formatTaskId(taskDefinition.id),
            option: argName,
            globalOptionPluginId: globalOptionEntry.pluginId,
          },
        );
      }
    });
  }

  #processTaskOverride(
    taskDefinition: TaskOverrideDefinition,
    pluginId?: string,
  ) {
    const task = this.getTask(taskDefinition.id);
    for (const [optionName, optionValue] of Object.entries(
      taskDefinition.options,
    )) {
      const hasArgument =
        task.options.has(optionName) ||
        task.positionalArguments.some((p) => p.name === optionName);
      if (hasArgument) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_OVERRIDE_OPTION_ALREADY_DEFINED,
          {
            actorFragment: getActorFragment(pluginId),
            option: optionName,
            task: formatTaskId(taskDefinition.id),
          },
        );
      }

      task.options.set(optionName, optionValue);
    }

    if (taskDefinition.description !== undefined) {
      task.description = taskDefinition.description;
    }

    task.actions.push({ pluginId, action: taskDefinition.action });
  }

  #validateTaskDefinition(taskDefinition: TaskDefinition): void {
    validateId(taskDefinition.id);

    // Empty tasks don't have actions, options, or positional arguments
    if (taskDefinition.type === TaskDefinitionType.EMPTY_TASK) {
      return;
    }

    const usedNames = new Set<string>();

    validateAction(taskDefinition.action);

    Object.values(taskDefinition.options).forEach((optionDefinition) =>
      validateOption(optionDefinition, usedNames, taskDefinition.id),
    );

    // Override tasks don't have positional arguments
    if (taskDefinition.type === TaskDefinitionType.TASK_OVERRIDE) {
      return;
    }

    let lastArg: PositionalArgumentDefinition;
    taskDefinition.positionalArguments.forEach((posArgDefinition) => {
      validatePositionalArgument(
        posArgDefinition,
        usedNames,
        taskDefinition.id,
        lastArg,
      );
      lastArg = posArgDefinition;
    });
  }
}

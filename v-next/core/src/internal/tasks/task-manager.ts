import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";

import { GlobalParameterMap } from "../../types/global-parameters.js";
import { HardhatRuntimeEnvironment } from "../../types/hre.js";
import {
  Task,
  TaskDefinition,
  TaskDefinitionType,
  TaskManager,
  NewTaskDefinition,
  TaskOverrideDefinition,
} from "../../types/tasks.js";

import { ResolvedTask } from "./resolved-task.js";
import { formatTaskId, getActorFragment } from "./utils.js";

export class TaskManagerImplementation implements TaskManager {
  readonly #hre: HardhatRuntimeEnvironment;
  readonly #rootTasks = new Map<string, Task>();

  constructor(
    hre: HardhatRuntimeEnvironment,
    globalParameterIndex: GlobalParameterMap,
  ) {
    this.#hre = hre;

    // reduce plugin tasks
    for (const plugin of this.#hre.config.plugins) {
      if (plugin.tasks === undefined) {
        continue;
      }

      for (const taskDefinition of plugin.tasks) {
        this.#reduceTaskDefinition(
          globalParameterIndex,
          taskDefinition,
          plugin.id,
        );
      }
    }

    // reduce global user defined tasks
    for (const taskDefinition of this.#hre.config.tasks) {
      this.#reduceTaskDefinition(globalParameterIndex, taskDefinition);
    }
  }

  public getTask(taskId: string | string[]): Task {
    taskId = Array.isArray(taskId) ? taskId : [taskId];
    if (taskId.length === 0) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.TASK_NOT_FOUND,
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
          HardhatError.ERRORS.TASK_DEFINITIONS.TASK_NOT_FOUND,
          {
            task: formatTaskId(taskId.slice(0, i + 1)),
          },
        );
      }

      task = currentTask;
      tasks = task.subtasks;
    }

    // task can't be undefined as we set it in the non-empty loop
    assertHardhatInvariant(task !== undefined, "Task not found");

    return task;
  }

  #insertTask(taskId: string[], task: Task, pluginId?: string) {
    if (taskId.length === 0) {
      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK_ID,
      );
    }

    // Traverse all the parent tasks to check that they exist
    let tasks = this.#rootTasks;
    for (let i = 0; i < taskId.length - 1; i++) {
      const idFragment = taskId[i];
      const currentTask = tasks.get(idFragment);
      if (currentTask === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.SUBTASK_WITHOUT_PARENT,
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
        HardhatError.ERRORS.TASK_DEFINITIONS.TASK_ALREADY_DEFINED,
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
    globalParameterIndex: GlobalParameterMap,
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
        this.#validateClashesWithGlobalParams(
          globalParameterIndex,
          taskDefinition,
          pluginId,
        );

        const task = ResolvedTask.createNewTask(
          this.#hre,
          taskDefinition.id,
          taskDefinition.description,
          taskDefinition.action,
          taskDefinition.namedParameters,
          taskDefinition.positionalParameters,
          pluginId,
        );

        this.#insertTask(taskDefinition.id, task, pluginId);
        break;
      }
      case TaskDefinitionType.TASK_OVERRIDE: {
        this.#validateClashesWithGlobalParams(
          globalParameterIndex,
          taskDefinition,
          pluginId,
        );

        this.#processTaskOverride(taskDefinition);
        break;
      }
    }
  }

  #validateClashesWithGlobalParams(
    globalParameterIndex: GlobalParameterMap,
    taskDefinition: NewTaskDefinition | TaskOverrideDefinition,
    pluginId?: string,
  ) {
    for (const namedParamName of Object.keys(taskDefinition.namedParameters)) {
      const globalParamEntry = globalParameterIndex.get(namedParamName);
      if (globalParamEntry !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.TASK_PARAMETER_ALREADY_DEFINED,
          {
            actorFragment: getActorFragment(pluginId),
            task: formatTaskId(taskDefinition.id),
            namedParamName,
            globalParamPluginId: globalParamEntry.pluginId,
          },
        );
      }
    }
  }

  #processTaskOverride(
    taskDefinition: TaskOverrideDefinition,
    pluginId?: string,
  ) {
    const task = this.getTask(taskDefinition.id);
    for (const [namedParamName, namedParamValue] of Object.entries(
      taskDefinition.namedParameters,
    )) {
      if (task.namedParameters.has(namedParamName)) {
        throw new HardhatError(
          HardhatError.ERRORS.TASK_DEFINITIONS.TASK_OVERRIDE_PARAMETER_ALREADY_DEFINED,
          {
            actorFragment: getActorFragment(pluginId),
            namedParamName,
            task: formatTaskId(taskDefinition.id),
          },
        );
      }

      task.namedParameters.set(namedParamName, namedParamValue);
    }

    if (taskDefinition.description !== undefined) {
      task.description = taskDefinition.description;
    }

    task.actions.push({ pluginId, action: taskDefinition.action });
  }
}

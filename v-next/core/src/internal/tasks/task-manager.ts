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
import { formatTaskId } from "./utils.js";

export class TaskManagerImplementation implements TaskManager {
  readonly #hre: HardhatRuntimeEnvironment;
  readonly #rootTasks = new Map<string, Task>();

  constructor(
    hre: HardhatRuntimeEnvironment,
    globalParameterIndex: GlobalParameterMap,
  ) {
    this.#hre = hre;

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

    for (const taskDefinition of this.#hre.config.tasks) {
      this.#reduceTaskDefinition(globalParameterIndex, taskDefinition);
    }
  }

  public getTask(taskId: string | string[]): Task {
    taskId = Array.isArray(taskId) ? taskId : [taskId];

    if (taskId.length === 0) {
      throw new Error(`Invalid task id "${formatTaskId(taskId)}"`);
    }

    let tasks = this.#rootTasks;
    let task: Task;

    for (let i = 0; i < taskId.length; i++) {
      const idFragment = taskId[i];

      const currentTask = tasks.get(idFragment);

      if (currentTask === undefined) {
        throw new Error(
          `Task "${formatTaskId(taskId.slice(0, i + 1))}" not found.`,
        );
      }

      task = currentTask;
      tasks = task.subtasks;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Can't be undefined as we set it in the non-empty loop.
    return task!;
  }

  #insertTask(taskId: string[], task: Task, pluginId?: string) {
    if (taskId.length === 0) {
      throw new Error(`Invalid task id "${formatTaskId(taskId)}"`);
    }

    let tasks = this.#rootTasks;

    for (let i = 0; i < taskId.length - 1; i++) {
      const idFragment = taskId[i];

      const currentTask = tasks.get(idFragment);

      if (currentTask === undefined) {
        throw new Error(
          `Task "${formatTaskId(taskId.slice(0, i + 1))}" not found and trying to define subtask "${formatTaskId(taskId)}". Define an empty task if you just want to define subtasks`,
        );
      }

      tasks = currentTask.subtasks;
    }

    const existingTask = tasks.get(taskId[taskId.length - 1]);

    if (existingTask === undefined) {
      tasks.set(taskId[taskId.length - 1], task);
      return;
    }

    const definedByMessage =
      existingTask.pluginId !== undefined
        ? ` by plugin ${existingTask.pluginId}`
        : "";

    if (pluginId !== undefined) {
      throw new Error(
        `Plugin ${pluginId} is trying to define the task "${formatTaskId(taskId)}" but it is already defined${definedByMessage}`,
      );
    }

    throw new Error(
      `You are trying to defined the task "${formatTaskId(taskId)}" is already defined${definedByMessage}`,
    );
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
        if (pluginId === undefined) {
          throw new Error(
            `Trying to define task "${formatTaskId(taskDefinition.id)}" with the named parameter ${namedParamName} but it is already defined as a global parameter by plugin ${globalParamEntry.pluginId}`,
          );
        } else {
          throw new Error(
            `Plugin ${pluginId} trying to define task "${formatTaskId(taskDefinition.id)}" with the named parameter ${namedParamName} but it is already defined as a global parameter by plugin ${globalParamEntry.pluginId}`,
          );
        }
      }
    }
  }

  #processTaskOverride(
    taskDefinition: TaskOverrideDefinition,
    pluginId?: string,
  ) {
    const task = this.getTask(taskDefinition.id);
    if (task === undefined) {
      if (pluginId !== undefined) {
        throw new Error(
          `Plugin ${pluginId} is trying to override the task "${formatTaskId(taskDefinition.id)}" but it hasn't been defined`,
        );
      } else {
        throw new Error(
          `Trying to override the task "${formatTaskId(taskDefinition.id)}" but it hasn't been defined`,
        );
      }
    }

    for (const paramName of Object.keys(taskDefinition.namedParameters)) {
      if (task.namedParameters.has(paramName)) {
        if (pluginId !== undefined) {
          throw new Error(
            `Plugin ${pluginId} is trying to override the named parameter ${paramName} of the task "${formatTaskId(taskDefinition.id)}" but it is already defined`,
          );
        } else {
          throw new Error(
            `Trying to override the named parameter ${paramName} of the task "${formatTaskId(taskDefinition.id)}" but it is already defined`,
          );
        }
      }
    }

    for (const namedParam of Object.values(taskDefinition.namedParameters)) {
      task.namedParameters.set(namedParam.name, namedParam);
    }

    if (taskDefinition.description !== undefined) {
      task.description = taskDefinition.description;
    }

    task.actions.push({ pluginId, action: taskDefinition.action });
  }
}

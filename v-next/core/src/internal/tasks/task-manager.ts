import { HardhatRuntimeEnvironment } from "../../types/hre.js";
import {
  Task,
  TaskArguments,
  TaskDefinition,
  TaskDefinitionType,
  TaskManager,
  NewTaskDefintion,
  TaskOverrideDefinition,
  TaskActions,
  NamedTaskParameter,
  PositionalTaskParameter,
  NewTaskActionFunction,
} from "../../types/tasks.js";
import { GlobalParameterMap } from "../global-parameters.js";

function formatTaskId(taskId: string | string[]): string {
  if (typeof taskId === "string") {
    return taskId;
  }

  return taskId.join(" ");
}

export class ResolvedTask implements Task {
  readonly #hre: HardhatRuntimeEnvironment;

  public static createEmptyTask(
    hre: HardhatRuntimeEnvironment,
    id: string[],
    description: string,
    pluginId?: string,
  ): ResolvedTask {
    return new ResolvedTask(
      id,
      description,
      [{ pluginId, action: undefined }],
      new Map(),
      [],
      pluginId,
      new Map(),
      hre,
    );
  }

  public static createNewTask(
    hre: HardhatRuntimeEnvironment,
    id: string[],
    description: string,
    action: NewTaskActionFunction | string,
    namedParameters: Record<string, NamedTaskParameter>,
    positionalParameters: PositionalTaskParameter[],
    pluginId?: string,
  ): ResolvedTask {
    return new ResolvedTask(
      id,
      description,
      [{ pluginId, action }],
      new Map(Object.entries(namedParameters)),
      positionalParameters,
      pluginId,
      new Map(),
      hre,
    );
  }

  constructor(
    public readonly id: string[],
    public readonly description: string,
    public readonly actions: TaskActions,
    public readonly namedParameters: Map<string, NamedTaskParameter>,
    public readonly positionalParameters: PositionalTaskParameter[],
    public readonly pluginId: string | undefined,
    public readonly subtasks: Map<string, Task>,
    hre: HardhatRuntimeEnvironment,
  ) {
    this.#hre = hre;
  }

  public get isEmpty(): boolean {
    return this.actions.length === 1 && this.actions[0].action === undefined;
  }

  public async run(taskArguments: TaskArguments): Promise<any> {
    // TODO: Run the task
    // - Validate the argument types
    // - Validate that there are no missing required arguments
    // - Resolve defaults for optional arguments
    // - Run the tasks actions with a chain of `runSuper`s
    console.log(`Running task "${formatTaskId(this.id)}"`);
    for (const action of this.actions) {
      if (action.pluginId !== undefined) {
        console.log(
          `  Running action from plugin ${action.pluginId}: ${action.action?.toString()}`,
        );
      } else {
        console.log(`  Running action: ${action.action?.toString()}`);
      }
    }

    void taskArguments;
    void this.#hre;
  }
}

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
    taskDefinition: NewTaskDefintion | TaskOverrideDefinition,
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

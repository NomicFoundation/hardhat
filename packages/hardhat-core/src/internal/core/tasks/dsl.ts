import {
  ActionType,
  TaskArguments,
  TaskDefinition,
  TasksMap,
} from "../../../types";

import {
  OverriddenTaskDefinition,
  SimpleTaskDefinition,
} from "./task-definitions";

/**
 * This class defines the DSL used in Hardhat config files
 * for creating and overriding tasks.
 */
export class TasksDSL {
  public readonly internalTask = this.subtask;

  private readonly _tasks: TasksMap = {};

  /**
   * Creates a task, overriding any previous task with the same name.
   *
   * @remarks The action must await every async call made within it.
   *
   * @param name The task's name.
   * @param description The task's description.
   * @param action The task's action.
   * @returns A task definition.
   */
  public task<ArgsT extends TaskArguments>(
    name: string,
    description?: string,
    action?: ActionType<ArgsT>
  ): TaskDefinition;

  /**
   * Creates a task without description, overriding any previous task
   * with the same name.
   *
   * @remarks The action must await every async call made within it.
   *
   * @param name The task's name.
   * @param action The task's action.
   *
   * @returns A task definition.
   */
  public task<ArgsT extends TaskArguments>(
    name: string,
    action: ActionType<ArgsT>
  ): TaskDefinition;

  public task<ArgsT extends TaskArguments>(
    name: string,
    descriptionOrAction?: string | ActionType<ArgsT>,
    action?: ActionType<ArgsT>
  ): TaskDefinition {
    return this._addTask(name, descriptionOrAction, action, false);
  }

  /**
   * Creates a subtask, overriding any previous task with the same name.
   *
   * @remarks The subtasks won't be displayed in the CLI help messages.
   * @remarks The action must await every async call made within it.
   *
   * @param name The task's name.
   * @param description The task's description.
   * @param action The task's action.
   * @returns A task definition.
   */
  public subtask<ArgsT extends TaskArguments>(
    name: string,
    description?: string,
    action?: ActionType<ArgsT>
  ): TaskDefinition;

  /**
   * Creates a subtask without description, overriding any previous
   * task with the same name.
   *
   * @remarks The subtasks won't be displayed in the CLI help messages.
   * @remarks The action must await every async call made within it.
   *
   * @param name The task's name.
   * @param action The task's action.
   * @returns A task definition.
   */
  public subtask<ArgsT extends TaskArguments>(
    name: string,
    action: ActionType<ArgsT>
  ): TaskDefinition;
  public subtask<ArgsT extends TaskArguments>(
    name: string,
    descriptionOrAction?: string | ActionType<ArgsT>,
    action?: ActionType<ArgsT>
  ): TaskDefinition {
    return this._addTask(name, descriptionOrAction, action, true);
  }

  /**
   * Retrieves the task definitions.
   *
   * @returns The tasks container.
   */
  public getTaskDefinitions(): TasksMap {
    return this._tasks;
  }

  private _addTask<ArgT extends TaskArguments>(
    name: string,
    descriptionOrAction?: string | ActionType<ArgT>,
    action?: ActionType<ArgT>,
    isSubtask?: boolean
  ) {
    const parentTaskDefinition = this._tasks[name];

    let taskDefinition: TaskDefinition;

    if (parentTaskDefinition !== undefined) {
      taskDefinition = new OverriddenTaskDefinition(
        parentTaskDefinition,
        isSubtask
      );
    } else {
      taskDefinition = new SimpleTaskDefinition(name, isSubtask);
    }

    if (descriptionOrAction instanceof Function) {
      action = descriptionOrAction;
      descriptionOrAction = undefined;
    }

    if (descriptionOrAction !== undefined) {
      taskDefinition.setDescription(descriptionOrAction);
    }

    if (action !== undefined) {
      taskDefinition.setAction(action);
    }

    this._tasks[name] = taskDefinition;
    return taskDefinition;
  }
}

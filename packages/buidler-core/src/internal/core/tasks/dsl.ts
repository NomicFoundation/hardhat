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
 * This class defines the DSL used in Buidler config files
 * for creating and overriding tasks.
 */
export class TasksDSL {
  private readonly _tasks: TasksMap = {};

  /**
   * Creates a task, overrdining any previous task with the same name.
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
   * Creates a task without description, overrdining any previous task
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
   * Creates an internal task, overrdining any previous task with the same name.
   *
   * @remarks The internal tasks won't be displayed in the CLI help messages.
   * @remarks The action must await every async call made within it.
   *
   * @param name The task's name.
   * @param description The task's description.
   * @param action The task's action.
   * @returns A task definition.
   */
  public internalTask<ArgsT extends TaskArguments>(
    name: string,
    description?: string,
    action?: ActionType<ArgsT>
  ): TaskDefinition;

  /**
   * Creates an internal task without description, overrdining any previous
   * task with the same name.
   *
   * @remarks The internal tasks won't be displayed in the CLI help messages.
   * @remarks The action must await every async call made within it.
   *
   * @param name The task's name.
   * @param action The task's action.
   * @returns A task definition.
   */
  public internalTask<ArgsT extends TaskArguments>(
    name: string,
    action: ActionType<ArgsT>
  ): TaskDefinition;
  public internalTask<ArgsT extends TaskArguments>(
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
    isInternal?: boolean
  ) {
    const parentTaskDefinition = this._tasks[name];

    let taskDefinition: TaskDefinition;

    if (parentTaskDefinition !== undefined) {
      taskDefinition = new OverriddenTaskDefinition(
        parentTaskDefinition,
        isInternal
      );
    } else {
      taskDefinition = new SimpleTaskDefinition(name, isInternal);
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

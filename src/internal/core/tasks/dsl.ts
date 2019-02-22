import {
  ActionType,
  TaskArguments,
  TaskDefinition,
  TasksMap
} from "../../../types";

import {
  OverriddenTaskDefinition,
  SimpleTaskDefinition
} from "./task-definitions";

/**
 * Tasks container.
 */
export class TasksDSL {
  private readonly tasks: TasksMap = {};

  /**
   * Creates a task.
   *
   * @remarks The action must await every async call made within it.
   *
   * @param name - The task's name.
   * @param description - The task's description.
   * @param action - The task's action.
   * @returns A task definition.
   */
  public task<ArgsT extends TaskArguments>(
    name: string,
    description?: string,
    action?: ActionType<ArgsT>
  ): TaskDefinition;

  /**
   * Creates a task without description.
   *
   * @remarks The action must await every async call made within it.
   *
   * @param name - The task's name.
   * @param action - The task's action.
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
    return this.addTask(name, descriptionOrAction, action, false);
  }

  /**
   * Creates an internal task.
   *
   * @remarks The internal tasks won't be available in the console options.
   * @remarks The action must await every async call made within it.
   *
   * @param name - The task's name.
   * @param description - The task's description.
   * @param action - The task's action.
   * @returns A task definition.
   */
  public internalTask<ArgsT extends TaskArguments>(
    name: string,
    description?: string,
    action?: ActionType<ArgsT>
  ): TaskDefinition;

  /**
   * Creates an internal task without description.
   *
   * @remarks The internal tasks won't be available in the console options.
   * @remarks The action must await every async call made within it.
   *
   * @param name - The task's name.
   * @param action - The task's action.
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
    return this.addTask(name, descriptionOrAction, action, true);
  }

  /**
   * Retrieves the task definitions.
   *
   * @returns The tasks container.
   */
  public getTaskDefinitions(): TasksMap {
    return this.tasks;
  }

  private addTask<ArgT extends TaskArguments>(
    name: string,
    descriptionOrAction?: string | ActionType<ArgT>,
    action?: ActionType<ArgT>,
    isInternal?: boolean
  ) {
    const parentTaskDefinition = this.tasks[name];

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

    this.tasks[name] = taskDefinition;

    return taskDefinition;
  }
}

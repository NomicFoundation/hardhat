import { ActionType, TaskArguments, TasksMap } from "../../types";

import {
  ITaskDefinition,
  OverloadedTaskDefinition,
  TaskDefinition
} from "./TaskDefinition";

export class TasksDSL {
  private readonly tasks: TasksMap = {};

  public task<ArgsT extends TaskArguments>(
    name: string,
    description?: string,
    action?: ActionType<ArgsT>
  ): ITaskDefinition;
  public task<ArgsT extends TaskArguments>(
    name: string,
    action: ActionType<ArgsT>
  ): ITaskDefinition;
  public task<ArgsT extends TaskArguments>(
    name: string,
    descriptionOrAction?: string | ActionType<ArgsT>,
    action?: ActionType<ArgsT>
  ): ITaskDefinition {
    return this.addTask(name, descriptionOrAction, action, false);
  }

  public internalTask<ArgsT extends TaskArguments>(
    name: string,
    description?: string,
    action?: ActionType<ArgsT>
  ): ITaskDefinition;
  public internalTask<ArgsT extends TaskArguments>(
    name: string,
    action: ActionType<ArgsT>
  ): ITaskDefinition;
  public internalTask<ArgsT extends TaskArguments>(
    name: string,
    descriptionOrAction?: string | ActionType<ArgsT>,
    action?: ActionType<ArgsT>
  ): ITaskDefinition {
    return this.addTask(name, descriptionOrAction, action, true);
  }

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

    let taskDefinition: ITaskDefinition;

    if (parentTaskDefinition !== undefined) {
      taskDefinition = new OverloadedTaskDefinition(
        parentTaskDefinition,
        isInternal
      );
    } else {
      taskDefinition = new TaskDefinition(name, isInternal);
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

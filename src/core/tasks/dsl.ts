import {
  ITaskDefinition,
  OverloadedTaskDefinition,
  TaskDefinition
} from "./TaskDefinition";
import { ActionType, TaskArguments, TasksMap } from "../../types";

export class TasksDSL {
  private readonly tasks: TasksMap = {};

  task<ArgsT extends TaskArguments>(
    name: string,
    description?: string
  ): ITaskDefinition;
  task<ArgsT extends TaskArguments>(
    name: string,
    action: ActionType<ArgsT>
  ): ITaskDefinition;
  task<ArgsT extends TaskArguments>(
    name: string,
    description: string,
    action: ActionType<ArgsT>
  ): ITaskDefinition;
  task<ArgsT extends TaskArguments>(
    name: string,
    descriptionOrAction?: string | ActionType<ArgsT>,
    action?: ActionType<ArgsT>
  ): ITaskDefinition {
    return this.addTask(name, descriptionOrAction, action, false);
  }

  internalTask<ArgsT extends TaskArguments>(
    name: string,
    description?: string
  ): ITaskDefinition;
  internalTask<ArgsT extends TaskArguments>(
    name: string,
    action: ActionType<ArgsT>
  ): ITaskDefinition;
  internalTask<ArgsT extends TaskArguments>(
    name: string,
    description: string,
    action: ActionType<ArgsT>
  ): ITaskDefinition;
  internalTask<ArgsT extends TaskArguments>(
    name: string,
    descriptionOrAction?: string | ActionType<ArgsT>,
    action?: ActionType<ArgsT>
  ): ITaskDefinition {
    return this.addTask(name, descriptionOrAction, action, true);
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

  getTaskDefinitions() {
    return this.tasks;
  }
}

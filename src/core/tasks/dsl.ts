import {
  ITaskDefinition,
  OverloadedTaskDefinition,
  TaskDefinition
} from "./TaskDefinition";
import {
  ActionType,
  TaskArguments,
  TasksMap
} from "../../types";

const tasks: TasksMap = {};

function addTask<ArgT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<ArgT>,
  action?: ActionType<ArgT>,
  isInternal?: boolean
) {
  const parentTaskDefinition = tasks[name];

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

  tasks[name] = taskDefinition;

  return taskDefinition;
}

export function task<ArgsT extends TaskArguments>(
  name: string,
  description?: string
): ITaskDefinition;
export function task<ArgsT extends TaskArguments>(
  name: string,
  action: ActionType<ArgsT>
): ITaskDefinition;
export function task<ArgsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<ArgsT>,
  action?: ActionType<ArgsT>
): ITaskDefinition {
  return addTask(name, descriptionOrAction, action, false);
}

export function internalTask<ArgsT extends TaskArguments>(
  name: string,
  description?: string
): ITaskDefinition;
export function internalTask<ArgsT extends TaskArguments>(
  name: string,
  action: ActionType<ArgsT>
): ITaskDefinition;
export function internalTask<ArgsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<ArgsT>,
  action?: ActionType<ArgsT>
): ITaskDefinition {
  return addTask(name, descriptionOrAction, action, true);
}

export function getTaskDefinitions() {
  return tasks;
}

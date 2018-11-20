import {
  ITaskDefinition,
  OverloadedTaskDefinition,
  TaskDefinition
} from "./TaskDefinition";
import {
  ActionType,
  BuidlerRuntimeEnvironment,
  RunSuperFunction,
  TaskArguments
} from "../../types";

const tasks: { [name: string]: ITaskDefinition } = {};

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

export async function runTask(
  env: BuidlerRuntimeEnvironment,
  name: string,
  taskArguments: TaskArguments
) {
  const taskDefinition = tasks[name];

  if (taskDefinition === undefined) {
    throw new Error(`Task ${name} not defined`);
  }

  return runTaskDefinition(env, taskDefinition, taskArguments);
}

export async function runTaskDefinition(
  env: BuidlerRuntimeEnvironment,
  taskDefinition: ITaskDefinition,
  taskArguments: TaskArguments
) {
  env.injectToGlobal();

  let runSuper: RunSuperFunction<TaskArguments>;

  if (taskDefinition instanceof OverloadedTaskDefinition) {
    runSuper = async (_taskArguments = taskArguments) =>
      runTaskDefinition(
        env,
        taskDefinition.parentTaskDefinition,
        _taskArguments
      );
  } else {
    runSuper = async () => {
      throw new Error(
        `Task ${
          taskDefinition.name
        } doesn't overload a previous one, so there's runSuper.`
      );
    };
  }

  const globalAsAny = global as any;

  globalAsAny.runSuper = runSuper;

  const taskResult = taskDefinition.action(taskArguments, env, runSuper);

  globalAsAny.runSuper = undefined;

  return taskResult;
}

export function getTaskDefinitions() {
  return tasks;
}

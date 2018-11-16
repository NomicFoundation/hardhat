import { OverloadedTaskDefinition, TaskDefinition } from "./TaskDefinition";
import { BuidlerError, ERRORS } from "../errors";

const tasks = {};

export function addTask(name, description, action, isInternal) {
  const parentTaskDefinition = tasks[name];

  let taskDefinition;

  if (parentTaskDefinition !== undefined) {
    taskDefinition = new OverloadedTaskDefinition(
      parentTaskDefinition,
      isInternal
    );
  } else {
    taskDefinition = new TaskDefinition(name, isInternal);
  }

  if (description instanceof Function) {
    action = description;
    description = undefined;
  }

  if (description !== undefined) {
    taskDefinition.setDescription(description);
  }

  if (action !== undefined) {
    taskDefinition.setAction(action);
  } else if (parentTaskDefinition === undefined) {
    taskDefinition.setAction(() => {
      throw new BuidlerError(ERRORS.TASKS_DEFINITION_NO_ACTION, name);
    });
  }

  tasks[name] = taskDefinition;

  return taskDefinition;
}

export function task(name, description, action) {
  return addTask(name, description, action, false);
}

export function internalTask(name, description, action) {
  return addTask(name, description, action, true);
}

export async function runTask(env, name, taskArguments, buidlerArguments) {
  const taskDefinition = tasks[name];

  if (taskDefinition === undefined) {
    throw new Error(`Task ${name} not defined`);
  }

  return runTaskDefinition(
    env,
    taskDefinition,
    taskArguments,
    buidlerArguments
  );
}

export async function runTaskDefinition(
  env,
  taskDefinition,
  taskArguments,
  buidlerArguments
) {
  env.injectToGlobal();

  const globalWithRunSupper = global as { runSuper?: (any) => Promise<any> };

  if (taskDefinition.parentTaskDefinition) {
    globalWithRunSupper.runSuper = async (
      _taskArguments = taskArguments,
      _buidlerArguments = buidlerArguments
    ) =>
      runTaskDefinition(
        env,
        taskDefinition.parentTaskDefinition,
        _taskArguments,
        _buidlerArguments
      );
  } else {
    globalWithRunSupper.runSuper = async () => {
      throw new Error(
        `Task ${
          taskDefinition.name
        } doesn't overload a previous one, so there's runSuper.`
      );
    };
  }

  const taskResult = taskDefinition.action(taskArguments, buidlerArguments);

  globalWithRunSupper.runSuper = undefined;

  return taskResult;
}

export function getTaskDefinitions() {
  return tasks;
}

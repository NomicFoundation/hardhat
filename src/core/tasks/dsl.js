"use strict";

const {
  TaskDefinition,
  OverloadedTaskDefinition
} = require("./TaskDefinition");

const tasks = {};

function addTask(name, description, action, isInternal) {
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
      throw new Error(`No action set for task ${name}.`);
    });
  }

  tasks[name] = taskDefinition;

  return taskDefinition;
}

function task(name, description, action) {
  return addTask(name, description, action, false);
}

function internalTask(name, description, action) {
  return addTask(name, description, action, true);
}

async function runTask(env, name, taskArguments, buidlerArguments) {
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

async function runTaskDefinition(
  env,
  taskDefinition,
  taskArguments,
  buidlerArguments
) {
  env.injectToGlobal();

  if (taskDefinition.parentTaskDefinition) {
    global.runSuper = async (
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
    global.runSuper = async () => {
      throw new Error(
        `Task ${
          taskDefinition.name
        } doesn't overload a previous one, so there's runSuper.`
      );
    };
  }

  const taskResult = taskDefinition.action(taskArguments, buidlerArguments);

  global.runSuper = undefined;

  return taskResult;
}

function getTaskDefinitions() {
  return tasks;
}

module.exports = {
  task,
  internalTask,
  runTask,
  getTaskDefinitions
};
